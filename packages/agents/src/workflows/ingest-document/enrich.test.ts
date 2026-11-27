import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { EnrichedPassage, PassageDraft, PassageEnrichContext } from '../../types'
import { DEFAULT_MODEL } from '../../utils/model'
import { enrichPassages, formatPassageEmbeddingText } from './enrich'

describe('enrichPassages', () => {
  it('returns an empty list without calling the enricher when there are no passages', async () => {
    let called = false

    const result = await enrichPassages(
      [],
      { title: 'Perda Uji', type: 'Perda', area: 'Kota Surabaya' },
      async () => {
        called = true
        return []
      },
    )

    assert.deepEqual(result, [])
    assert.equal(called, false)
  })

  it('calls DEFAULT_MODEL via generateCompletion when no enricher is injected and normalizes output', async (t) => {
    const savedKey = process.env.GATEWAY_API_KEY
    const savedBaseUrl = process.env.GATEWAY_BASE_URL
    process.env.GATEWAY_API_KEY = 'test-gateway-key'
    process.env.GATEWAY_BASE_URL = 'https://gateway.example.test/v1'

    let capturedModel: unknown
    t.mock.method(globalThis, 'fetch', async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      capturedModel = body.model

      return new Response(
        JSON.stringify({
          id: 'chatcmpl-test',
          object: 'chat.completion',
          created: 0,
          model: DEFAULT_MODEL,
          choices: [
            {
              index: 0,
              finish_reason: 'stop',
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  passages: [
                    {
                      index: 0,
                      topics: ['substansi_teknis', 'prosedur'],
                      tags: ['  KDB ', 'kdb', '', 'PBG'],
                    },
                  ],
                }),
              },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    })

    try {
      const passages: PassageDraft[] = [
        {
          index: 0,
          heading: 'Perda Uji › Pasal 1',
          text: 'Pasal 1\nKetentuan KDB dan PBG.',
          pageStart: 1,
          pageEnd: 1,
        },
      ]
      const enriched = await enrichPassages(passages, {
        title: 'Perda Uji',
        type: 'Perda',
        area: 'Kota Surabaya',
      })

      assert.equal(capturedModel, DEFAULT_MODEL)
      assert.deepEqual(enriched, [
        {
          ...passages[0],
          topics: ['substansi_teknis', 'prosedur'],
          tags: ['kdb', 'pbg'],
        },
      ])
    } finally {
      if (savedKey === undefined) delete process.env.GATEWAY_API_KEY
      else process.env.GATEWAY_API_KEY = savedKey

      if (savedBaseUrl === undefined) delete process.env.GATEWAY_BASE_URL
      else process.env.GATEWAY_BASE_URL = savedBaseUrl
    }
  })

  it('retries once when a batch response includes a duplicate passage index', async () => {
    const passages: PassageDraft[] = [
      { index: 0, heading: 'H0', text: 'T0', pageStart: 1, pageEnd: 1 },
      { index: 1, heading: 'H1', text: 'T1', pageStart: 1, pageEnd: 1 },
    ]
    let calls = 0

    const enriched = await enrichPassages(
      passages,
      { title: 'Perda Uji', type: 'Perda', area: 'Kota Surabaya' },
      async (batch) => {
        calls += 1

        if (calls === 1) {
          return [
            { index: 0, topics: ['ketentuan_umum'], tags: ['awal'] },
            { index: 0, topics: ['prosedur'], tags: ['timpa'] },
            { index: 1, topics: ['substansi_teknis'], tags: ['b1'] },
          ]
        }

        return batch.map((passage) => ({
          index: passage.index,
          topics: ['ketentuan_umum'],
          tags: [`ok-${passage.index}`],
        }))
      },
    )

    assert.equal(calls, 2)
    assert.deepEqual(
      enriched.map((item) => item.tags),
      [['ok-0'], ['ok-1']],
    )
  })

  it('retries once when a batch response includes an unknown passage index', async () => {
    const passages: PassageDraft[] = [
      { index: 0, heading: 'H0', text: 'T0', pageStart: 1, pageEnd: 1 },
      { index: 1, heading: 'H1', text: 'T1', pageStart: 1, pageEnd: 1 },
    ]
    let calls = 0

    const enriched = await enrichPassages(
      passages,
      { title: 'Perda Uji', type: 'Perda', area: 'Kota Surabaya' },
      async (batch) => {
        calls += 1

        if (calls === 1) {
          return [
            { index: 0, topics: ['ketentuan_umum'], tags: ['a'] },
            { index: 1, topics: ['substansi_teknis'], tags: ['b'] },
            { index: 99, topics: ['lampiran'], tags: ['asing'] },
          ]
        }

        return batch.map((passage) => ({
          index: passage.index,
          topics: ['ketentuan_umum'],
          tags: [`ok-${passage.index}`],
        }))
      },
    )

    assert.equal(calls, 2)
    assert.deepEqual(
      enriched.map((item) => item.tags),
      [['ok-0'], ['ok-1']],
    )
  })

  it('does not call the enricher when abortSignal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort(new Error('Cancelled before start'))
    let calls = 0

    await assert.rejects(
      enrichPassages(
        [{ index: 0, heading: 'H0', text: 'T0', pageStart: 1, pageEnd: 1 }],
        {
          title: 'Perda Uji',
          type: 'Perda',
          area: 'Kota Surabaya',
          abortSignal: controller.signal,
        },
        async () => {
          calls += 1
          return []
        },
      ),
      /Cancelled before start/,
    )

    assert.equal(calls, 0)
  })

  it('does not retry when abortSignal aborts during the first attempt', async () => {
    const controller = new AbortController()
    let calls = 0

    await assert.rejects(
      enrichPassages(
        [{ index: 0, heading: 'H0', text: 'T0', pageStart: 1, pageEnd: 1 }],
        {
          title: 'Perda Uji',
          type: 'Perda',
          area: 'Kota Surabaya',
          abortSignal: controller.signal,
        },
        async () => {
          calls += 1
          controller.abort(new Error('Aborted mid-batch'))
          throw new Error('Aborted mid-batch')
        },
      ),
      /Aborted mid-batch/,
    )

    assert.equal(calls, 1)
  })

  it('aborts sibling in-flight batches when a batch fails permanently', async () => {
    const passages: PassageDraft[] = Array.from({ length: 16 }, (_, index) => ({
      index,
      heading: `H${index}`,
      text: `T${index}`,
      pageStart: 1,
      pageEnd: 1,
    }))
    let markSiblingStarted!: () => void
    const siblingStarted = new Promise<void>((resolve) => {
      markSiblingStarted = resolve
    })
    let siblingContext: PassageEnrichContext | undefined
    let batch1Calls = 0

    await assert.rejects(
      enrichPassages(
        passages,
        { title: 'Perda Uji', type: 'Perda', area: 'Kota Surabaya' },
        async (batch, context) => {
          if (batch[0].index === 0) {
            siblingContext = context
            markSiblingStarted()

            return new Promise((resolve) => {
              if (context.abortSignal?.aborted) {
                resolve([])
                return
              }

              context.abortSignal?.addEventListener('abort', () => resolve([]), { once: true })
            })
          }

          batch1Calls += 1
          await siblingStarted
          throw new Error('Permanent batch 1 failure')
        },
      ),
      /Permanent batch 1 failure/,
    )

    assert.equal(batch1Calls, 2)
    assert.equal(siblingContext?.abortSignal?.aborted, true)
  })

  it('fails fast on attempt 1 without retry when gateway env is missing', async (t) => {
    const savedEnv = process.env
    const envCopy = { ...savedEnv }
    delete envCopy.GATEWAY_API_KEY
    let keyReads = 0
    let fetchCalls = 0

    t.mock.method(globalThis, 'fetch', async () => {
      fetchCalls += 1
      return new Response(null, { status: 500 })
    })

    Object.defineProperty(process, 'env', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: new Proxy(envCopy, {
        get(target, prop, receiver) {
          if (prop === 'GATEWAY_API_KEY') keyReads += 1

          return Reflect.get(target, prop, receiver)
        },
      }),
    })

    try {
      await assert.rejects(
        enrichPassages(
          [
            { index: 0, heading: 'H0', text: 'T0', pageStart: 1, pageEnd: 1 },
            { index: 8, heading: 'H8', text: 'T8', pageStart: 1, pageEnd: 1 },
          ],
          { title: 'Perda Uji', type: 'Perda', area: 'Kota Surabaya' },
        ),
        /Set GATEWAY_API_KEY before running an agent/,
      )

      assert.equal(keyReads, 1)
      assert.equal(fetchCalls, 0)
    } finally {
      Object.defineProperty(process, 'env', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: savedEnv,
      })
    }
  })
})

describe('formatPassageEmbeddingText', () => {
  const base: EnrichedPassage = {
    index: 0,
    heading: 'Perda Uji › Pasal 1',
    text: 'Pasal 1\nIsi pasal.',
    pageStart: 1,
    pageEnd: 1,
    topics: [],
    tags: [],
  }

  it('keeps heading and text unchanged when topics and tags are empty', () => {
    assert.equal(formatPassageEmbeddingText(base), 'Perda Uji › Pasal 1\nPasal 1\nIsi pasal.')
  })

  it('appends only Topik when tags are empty', () => {
    assert.equal(
      formatPassageEmbeddingText({ ...base, topics: ['ketentuan_umum'] }),
      'Perda Uji › Pasal 1\nPasal 1\nIsi pasal.\nTopik: ketentuan_umum',
    )
  })

  it('appends only Tag when topics are empty', () => {
    assert.equal(
      formatPassageEmbeddingText({ ...base, tags: ['kdb', 'klb'] }),
      'Perda Uji › Pasal 1\nPasal 1\nIsi pasal.\nTag: kdb, klb',
    )
  })

  it('appends Topik and Tag lines when both are present', () => {
    assert.equal(
      formatPassageEmbeddingText({
        ...base,
        topics: ['substansi_teknis', 'prosedur'],
        tags: ['kdb', 'pbg'],
      }),
      'Perda Uji › Pasal 1\nPasal 1\nIsi pasal.\nTopik: substansi_teknis, prosedur\nTag: kdb, pbg',
    )
  })
})
