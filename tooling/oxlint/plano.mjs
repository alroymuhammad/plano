const STATEMENT_LISTS = {
  Program: 'body',
  BlockStatement: 'body',
  StaticBlock: 'body',
  SwitchCase: 'consequent',
}

const paddingAroundIf = {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    messages: { missing: 'Expected a blank line {{side}} this if statement.' },
  },
  create(context) {
    const text = context.sourceCode.getText()

    function check(prev, next, ifNode, side) {
      const between = text.slice(prev.range[1], next.range[0])

      if (/\n[ \t]*\r?\n/.test(between)) return

      context.report({
        node: ifNode,
        messageId: 'missing',
        data: { side },
        fix: (fixer) => fixer.insertTextAfter(prev, '\n'),
      })
    }

    return {
      IfStatement(node) {
        const key = STATEMENT_LISTS[node.parent.type]

        if (!key) return

        const siblings = node.parent[key]
        const index = siblings.indexOf(node)

        if (index > 0) check(siblings[index - 1], node, node, 'before')

        if (index < siblings.length - 1) check(node, siblings[index + 1], node, 'after')
      },
    }
  },
}

export default {
  meta: { name: 'plano' },
  rules: { 'padding-around-if': paddingAroundIf },
}
