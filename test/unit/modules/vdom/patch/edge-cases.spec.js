import Vue from 'vue'

describe('vdom patch: edge cases', () => {
  // exposed by #3406
  // When a static vnode is inside v-for, it's possible for the same vnode
  // to be used in multiple places, and its element will be replaced. This
  // causes patch errors when node ops depend on the vnode's element position.
  it('should handle static vnodes by key', done => {
    const vm = new Vue({
      data: {
        ok: true
      },
      template: `
        <div>
          <div v-for="i in 2">
            <div v-if="ok">a</div><div>b</div><div v-if="!ok">c</div><div>d</div>
          </div>
        </div>
      `
    }).$mount()
    expect(vm.$el.textContent).toBe('abdabd')
    vm.ok = false
    waitForUpdate(() => {
      expect(vm.$el.textContent).toBe('bcdbcd')
    }).then(done)
  })

  // #3533
  // a static node (<br>) is reused in createElm, which changes its elm reference
  // and is inserted into a different parent.
  // later when patching the next element a DOM insertion uses it as the
  // reference node, causing a parent mismatch.
  it('should handle static node edge case when it\'s reused AND used as a reference node for insertion', done => {
    const vm = new Vue({
      data: {
        ok: true
      },
      template: `
        <div>
          <button @click="ok = !ok">toggle</button>
          <div class="b" v-if="ok">123</div>
          <div class="c">
            <br><p>{{ 1 }}</p>
          </div>
          <div class="d">
            <label>{{ 2 }}</label>
          </div>
        </div>
      `
    }).$mount()

    expect(vm.$el.querySelector('.c').textContent).toBe('1')
    expect(vm.$el.querySelector('.d').textContent).toBe('2')
    vm.ok = false
    waitForUpdate(() => {
      expect(vm.$el.querySelector('.c').textContent).toBe('1')
      expect(vm.$el.querySelector('.d').textContent).toBe('2')
    }).then(done)
  })

  it('should synchronize vm\' vnode', done => {
    const comp = {
      data: () => ({ swap: true }),
      render (h) {
        return this.swap
          ? h('a', 'atag')
          : h('span', 'span')
      }
    }

    const wrapper = {
      render: h => h('comp'),
      components: { comp }
    }

    const vm = new Vue({
      render (h) {
        const children = [
          h('wrapper'),
          h('div', 'row')
        ]
        if (this.swap) {
          children.reverse()
        }
        return h('div', children)
      },
      data: () => ({ swap: false }),
      components: { wrapper }
    }).$mount()

    expect(vm.$el.innerHTML).toBe('<a>atag</a><div>row</div>')
    const wrapperVm = vm.$children[0]
    const compVm = wrapperVm.$children[0]
    vm.swap = true
    waitForUpdate(() => {
      expect(compVm.$vnode.parent).toBe(wrapperVm.$vnode)
      expect(vm.$el.innerHTML).toBe('<div>row</div><a>atag</a>')
      vm.swap = false
    })
    .then(() => {
      expect(compVm.$vnode.parent).toBe(wrapperVm.$vnode)
      expect(vm.$el.innerHTML).toBe('<a>atag</a><div>row</div>')
      compVm.swap = false
    })
    .then(() => {
      expect(vm.$el.innerHTML).toBe('<span>span</span><div>row</div>')
      expect(compVm.$vnode.parent).toBe(wrapperVm.$vnode)
      vm.swap = true
    })
    .then(() => {
      expect(vm.$el.innerHTML).toBe('<div>row</div><span>span</span>')
      expect(compVm.$vnode.parent).toBe(wrapperVm.$vnode)
      vm.swap = true
    })
    .then(done)
  })
})
