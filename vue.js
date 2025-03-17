// Vue 框架核心类，负责数据响应式和模板编译
class Vue {
  constructor(options) {
    this.$options = options; // 保存用户配置选项
    this.$data = options.data; // 保存数据对象
    this.initData(); // 初始化数据响应式
    this.compile(options.el); // 编译模板
  }

  // 初始化数据响应式系统
  initData() {
    observe(this.$data); // 将数据对象转为响应式
    this.proxyData(); // 将数据代理到 Vue 实例
  }

  // 将 $data 中的属性直接挂载到 Vue 实例，实现 this.key 直接访问 this.$data.key
  proxyData() {
    Object.keys(this.$data).forEach(key => {
      Object.defineProperty(this, key, {
        get: () => this.$data[key], // 代理读取操作
        set: newVal => (this.$data[key] = newVal), // 代理写入操作
      });
    });
  }

  // 模板编译入口
  compile(el) {
    const element = document.querySelector(el);
    if (!element) throw new Error('未找到根节点');

    // 使用文档片段优化 DOM 操作
    this.$el = this.createFragment(element);
    // 编译节点内容
    this.compileNode(this.$el);
    // 将处理后的 DOM 重新挂载
    element.appendChild(this.$el);
  }

  // 创建文档片段，减少 DOM 操作次数，优化性能
  createFragment(element) {
    const fragment = document.createDocumentFragment();
    let child = null;
    // 将原始 DOM 移入文档片段
    while ((child = element.firstChild)) {
      fragment.appendChild(child);
    }
    return fragment;
  }

  // 递归编译所有节点
  compileNode(node) {
    node.childNodes.forEach(child => {
      // 文本节点：处理插值表达式
      if (child.nodeType === Node.TEXT_NODE) {
        this.compileTextNode(child);
      }
      // 元素节点：处理指令（如 v-model）
      else if (child.nodeType === Node.ELEMENT_NODE) {
        this.compileElementNode(child);
      }
      // 递归处理子节点
      if (child.childNodes.length) {
        this.compileNode(child);
      }
    });
  }

  // 处理文本节点中的 {{ key }} 插值表达式
  compileTextNode(node) {
    const originalText = node.nodeValue;
    // 提取所有插值表达式中的键名
    const keys = this.extractKeys(originalText);
    if (!keys.length) return;

    // 创建更新函数
    const updateText = () => {
      node.nodeValue = this.replaceText(originalText, keys);
    };
    updateText(); // 初始化显示

    // 为每个键创建观察者，数据变化时更新视图
    keys.forEach(key => new Watcher(this, key, updateText));
  }

  // 处理元素节点中的指令
  compileElementNode(element) {
    Array.from(element.attributes).forEach(attr => {
      // 处理 v-model 双向绑定
      if (attr.name === 'v-model') {
        this.bindModel(element, attr.value);
        element.removeAttribute('v-model'); // 移除指令属性
      }
    });
  }

  // 实现 v-model 双向绑定
  bindModel(element, exp) {
    // 数据变化 -> 更新视图
    const updateValue = () => {
      element.value = getValue(this.$data, exp);
    };
    updateValue();

    // 创建观察者监听数据变化
    new Watcher(this, exp, updateValue);

    // 视图变化 -> 更新数据（监听输入事件）
    element.addEventListener('input', e => setValue(this.$data, exp, e.target.value));
  }

  // 正则提取插值表达式中的键名
  extractKeys(text) {
    const regex = /\{\{\s*(\S+)\s*\}\}/g;
    const keys = [];
    let match = null;
    while ((match = regex.exec(text))) {
      keys.push(match[1]); // 捕获组内容即为键名
    }
    return keys;
  }

  // 将插值表达式替换为实际数据
  replaceText(text, keys) {
    return keys.reduce((str, key) => {
      const value = getValue(this.$data, key);
      return str.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
    }, text);
  }
}

// 响应式系统核心：将对象转为响应式
function observe(obj) {
  // 终止条件：非对象或 null
  if (!obj || typeof obj !== 'object') return;
  Object.keys(obj).forEach(key => defineReactive(obj, key, obj[key]));
}

// 定义响应式属性
function defineReactive(obj, key, value) {
  const dep = new Dep(); // 每个属性对应一个依赖管理器

  // 递归处理嵌套对象
  observe(value);
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      // 收集依赖：当有 Watcher 读取时，将其加入依赖列表
      Dep.target && dep.addSub(Dep.target);
      return value;
    },
    set(newVal) {
      if (newVal === value) return;
      console.log(`属性 ${key} 更新: ${value} => ${newVal}`);
      value = newVal;
      // 新值是对象时需要转为响应式
      observe(newVal);
      // 通知所有依赖进行更新
      dep.notify();
    },
  });
}

// 工具函数：获取嵌套属性值（如 'a.b.c'）
function getValue(obj, path) {
  return path.split('.').reduce((o, k) => o[k], obj);
}

// 工具函数：设置嵌套属性值
function setValue(obj, path, newVal) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((o, k) => o[k], obj);
  target[lastKey] = newVal;
}

// 依赖管理器（发布者）
class Dep {
  constructor() {
    this.subs = new Set();
  }

  // 添加观察者
  addSub(sub) {
    this.subs.add(sub);
  }

  // 通知所有观察者更新
  notify() {
    this.subs.forEach(sub => sub.update());
  }
}

/** 观察者（订阅者） */
class Watcher {
  /**
   * @param vm Vue 实例
   * @param exp 监听的表达式（如 'user.name'）
   * @param cb 数据变化时的回调函数
   */
  constructor(vm, exp, cb) {
    this.vm = vm;
    this.exp = exp;
    this.cb = cb;

    // 通过读取数据触发 getter 来收集依赖
    Dep.target = this;
    getValue(vm.$data, exp);
    Dep.target = null; // 收集完成后重置
  }

  // 被 Dep 通知时执行回调
  update() {
    this.cb(getValue(this.vm.$data, this.exp));
  }
}
