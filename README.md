# Vue 响应式系统简易实现

通过 `Object.defineProperty` 简单实现 Vue 的响应式系统，核心功能包括：**数据响应式**、**模板编译**、**依赖收集**与**更新**。通过以下核心模块实现 MVVM 模式：

- **数据代理**：通过代理使 `this.key` 直接访问 `$data` 中的属性
- **响应式系统**：基于 `Object.defineProperty` 实现数据监听
- **模板编译**：解析 `{{}}` 插值表达式和 `v-model` 指令
- **依赖管理**：通过 `Dep` 和 `Watcher` 实现观察者模式

## 核心功能

### 1. 数据代理

- **功能**：将 `$data` 的属性代理到 Vue 实例上

- **实现方式**：

  ```js
  proxyData() {
    Object.keys(this.$data).forEach(key => {
      Object.defineProperty(this, key, {
        get: () => this.$data[key],
        set: newVal => (this.$data[key] = newVal),
      });
    });
  }
  ```

- **效果**：可直接通过 `this.key` 访问/修改数据，无需 `this.$data.key`


### 2. 响应式系统

#### 核心方法

- **`observe(obj)`** - 通过递归将对象属性转换为响应式数据
- **`defineReactive(obj, key, value)`** - 使用 `Object.defineProperty` 定义属性的 getter/setter

#### 特性

- **依赖收集**：在 getter 中通过 `Dep` 收集 `Watcher`
- **派发更新**：在 setter 中通过 `Dep.notify()` 触发更新
- **深层监听**：对嵌套对象递归调用 `observe`

### 3. 模板编译

#### 处理流程

1. **创建文档片段**

   ```js
   createFragment(element) // 将 DOM 移入内存处理
   ```

2. **节点编译**

   - **文本节点**：解析 `{{ key }}` 插值表达式

     ```js
     compileTextNode(node)
     ```

   - **元素节点**：处理 `v-model` 指令

     ```js
     compileElementNode(element)
     ```

#### 指令支持

- **`v-model`** 双向绑定实现：

  ```js
  // 数据 -> 视图
  new Watcher(...)
  // 视图 -> 数据
  element.addEventListener('input', ...)
  ```

### 4. 依赖管理

#### `Dep` 类

- **职责**：管理一组 `Watcher`
- **核心方法**：
  - `addSub()`：添加观察者
  - `notify()`：通知所有观察者更新

#### `Watcher` 类

- **触发时机**：数据变化时通过 `Dep` 通知更新

- **更新机制**：

  ```js
  new Watcher(vm, exp, updateFunction)
  ```

## 关键代码解析

### 数据响应式流程

```js
// 初始化数据响应式
initData() {
  observe(this.$data); // 递归监听数据
  this.proxyData();    // 数据代理
}

// 定义响应式属性
function defineReactive(obj, key, value) {
  const dep = new Dep(); // 每个属性对应一个 Dep

  observe(value);
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      Dep.target && dep.addSub(Dep.target); // 收集 Watcher
      return value;
    },
    set(newVal) {
      value = newVal;
      observe(value);
      dep.notify(); // 触发更新
    }
  });
}
```

### 模板编译示例

#### 插值表达式处理

```js
// 文本节点编译过程
compileTextNode(node) {
  const keys = this.extractKeys(text); // 提取 {{ key }}
  keys.forEach(key => new Watcher(...)); // 为每个 key 创建观察者
}
```

#### `v-model` 实现

```js
// 双向绑定实现
bindModel(node, exp) {
  // 数据 -> 视图
  new Watcher(this, exp, updateValue);
  // 视图 -> 数据
  node.addEventListener('input', e => {
    setValue(this.$data, exp, e.target.value);
  });
}
```

## 工具函数

### `getValue(obj, path)`

- **作用**：通过路径获取嵌套属性值
  示例：`getValue({ a: { b: 2 } }, 'a.b')` => `2`

### `setValue(obj, path, newVal)`

- **作用**：通过路径设置嵌套属性值

## 使用示例

### 初始化

```js
const vm = new Vue({
  el: '#app',
  data: {
    message: 'Hello',
    user: { name: 'xissium' }
  }
});
```

### 模板

```html
<div id="app">
  <span>message：{{ message }}</span>
  <input type="text" v-model="message" />
  <span>user：{{ user.name }}</span>
  <input type="text" v-model="user.name" />
</div>
```

## 注意事项

1. **对象监听限制**
   不支持数组的响应式监听，需使用对象风格数据
2. **属性路径**
   使用点分隔路径访问嵌套属性（如 `user.name`）
3. **性能优化**
   通过文档片段（`createFragment`）减少 DOM 操作次数

## 类与方法清单

| 类/方法                          | 说明                                |
| :------------------------------- | :---------------------------------- |
| `Vue`                            | 主类，整合响应式数据与模板编译      |
| `Vue.compile()`                  | 编译模板，处理插值与指令            |
| `Dep`                            | 依赖管理器，收集 Watcher 并通知更新 |
| `Watcher`                        | 观察者，连接数据变化与视图更新      |
| `observe()` / `defineReactive()` | 实现数据响应式的核心函数            |
