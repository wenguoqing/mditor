const mokit = require('mokit');
const Toolbar = require('../toolbar');
const Editor = require('../editor');
const Viewer = require('../viewer');
const Shortcut = require('./shortcut');
const Parser = require('../common/parser');
const marked = require('marked');

require('font-awesome/css/font-awesome.css');
require('github-markdown-css/github-markdown.css');
require('highlight.js/styles/default.css');
require('./index.less');

const Mditor = new mokit.Component({
  template: require('./index.html'),

  onInit() {
    this.PLATFORM = navigator.platform.toLowerCase();
    this.EOL = this.PLATFORM == 'win32' ? '\r\n' : '\n';
    this.CMD = this.PLATFORM.indexOf('mac') > -1 ? 'command' : 'ctrl';
    this.INDENT = '\t';
    this.shortcut = new Shortcut(this);
    this.Parser = Parser;
    this.marked = marked;
    this.parser = new Parser(this);
  },

  onReady() {
    this.shortcut.bind('tab', this.editor.addIndent.bind(this.editor));
    this.shortcut.bind('shift+tab', this.editor.removeIndent.bind(this.editor));
    this.shortcut.bind('enter', () => {
      this._ulAndQuoteAutoComplete();
      this._olAutoComplete();
      this._keepIndent();
    }, true);
    setTimeout(() => {
      this.$emit('ready');
    }, 0);
  },

  components: {
    Toolbar,
    Editor,
    Viewer
  },

  props: {
    height: '400px',
    width: 'auto',
    preview: false,
    split: true,
    fullscreen: false
  },

  data() {
    return {
      self: this,
      value: ''
    };
  },

  scroll() {
    if (!this.split || this.preview) return;
    let offsetHeight = this.editor.$element.offsetHeight;
    let editorScrollHeight = this.editor.$element.scrollHeight;
    let viewerScrollHeight = this.viewer.$element.scrollHeight;
    let editorScrollTop = this.editor.$element.scrollTop;
    let viewerScrollTop = editorScrollTop * (viewerScrollHeight - offsetHeight) / (editorScrollHeight - offsetHeight);
    this.viewer.$element.scrollTop = viewerScrollTop;
  },

  onChanged() {
    this.$emit('changed');
  },

  _keepIndent() {
    let text = this.editor.getBeforeTextInLine();
    let parts = text.split(this.INDENT);
    if (parts.length < 2) return;
    let count = 0;
    let buffer = [this.EOL];
    while (parts[count] === '' &&
      count < (parts.length - 1)) {
      count++;
      buffer.push(this.INDENT);
    }
    this.editor.insertBeforeText(buffer.join(''));
    event.preventDefault();
  },

  _ulAndQuoteAutoComplete() {
    let text = this.editor.getBeforeTextInLine();
    let prefix = text.substr(0, 2);
    if (prefix != '- ' && prefix != '* ' && prefix != '> ') return;
    if (text.length > prefix.length) {
      this.editor.insertBeforeText(this.EOL + prefix);
    } else {
      this.editor.selectBeforeText(prefix.length);
      this.editor.setSelectText('');
    }
    event.preventDefault();
  },

  _olAutoComplete() {
    let exp = /^\d+\./;
    let text = this.editor.getBeforeTextInLine();
    let trimedText = text.trim();
    if (!exp.test(trimedText)) return;
    let num = trimedText.split('.')[0];
    if (trimedText.length > num.length + 1) {
      this.editor.insertBeforeText(this.EOL + (parseInt(num) + 1) + '. ');
    } else {
      this.editor.selectBeforeText(text.length);
      this.editor.setSelectText('');
    }
    event.preventDefault();
  },

  focus() {
    this.editor.focus();
  },

  blur() {
    this.editor.blur();
  },

  addCommand(item) {
    if (!item.name || !item.handler) return;
    this.commands = this.commands || {};
    this.commands[item.name] = item;
    if (item.key) {
      this.shortcut.bind(item.key, item.name);
    }
  },

  removeCommand(name) {
    this.commands = this.commands || {};
    let item = this.commands[name];
    if (!item) return;
    this.shortcut.unbind(item.key);
    this.commands[name] = null;
    delete this.commands[name];
  },

  execCommand(name, event) {
    event = event || {};
    event.mditor = this;
    event.toolbar = this.toolbar;
    event.editor = this.editor;
    this.commands[name].handler.call(this, event);
  }

});

Mditor.fromTextarea = function (textarea) {
  textarea.style.display = 'none';
  let mditor = new Mditor();
  mditor.value = textarea.value;
  mditor.$watch('value', () => {
    textarea.value = mditor.value;
  });
  mditor.$mount(textarea);
  return mditor;
};

Mditor.Parser = Parser;
Mditor.marked = marked;

module.exports = window.Mditor = Mditor;