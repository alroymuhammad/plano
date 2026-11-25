import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const session = pgTable(
  'session',
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('session_userId_idx').on(t.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [index('account_userId_idx').on(t.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
)

// Library (decision 0020). Postgres is the source of truth; Qdrant only holds vectors and a copy of Passage text.
export const documentStatus = pgEnum('document_status', ['active', 'superseded', 'revoked'])

export const document = pgTable(
  'document',
  {
    id: text().primaryKey(),
    // No foreign key yet: Studio ingests for a dev Analyst who has no user row.
    analystId: text().notNull(),
    title: text().notNull(),
    type: text().notNull(),
    number: text(),
    year: integer(),
    area: text().notNull(),
    status: documentStatus().notNull().default('active'),
    confirmed: boolean().notNull().default(false),
    fileHash: text().notNull(),
    storageUri: text().notNull(),
    pageCount: integer().notNull(),
    indexedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('document_analystId_fileHash_unique').on(t.analystId, t.fileHash)],
)

export const documentPage = pgTable(
  'document_page',
  {
    documentId: text()
      .notNull()
      .references(() => document.id, { onDelete: 'cascade' }),
    page: integer().notNull(),
    text: text().notNull(),
    ocr: boolean().notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.documentId, t.page] })],
)

export const passage = pgTable(
  'passage',
  {
    id: text().primaryKey(),
    documentId: text()
      .notNull()
      .references(() => document.id, { onDelete: 'cascade' }),
    index: integer().notNull(),
    heading: text().notNull(),
    text: text().notNull(),
    pageStart: integer().notNull(),
    pageEnd: integer().notNull(),
  },
  (t) => [index('passage_documentId_idx').on(t.documentId)],
)

export {
  agentMemoryErrors,
  agentMemoryMessages,
  agentMemorySessions,
  agentMemoryWrites,
} from '@anvia/memory-drizzle'
