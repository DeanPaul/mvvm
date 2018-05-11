class Sec {
    constructor(v) {
        if (!v.el || !v.data) {
            throw new Error('need an object to observe.');
        }
        this.data = v.data;
        this.el = document.querySelector(v.el);
        this.methods = v.methods;
        for (let method in this.methods) {
            this.methods[method] = this.methods[method].bind(this.data)
        }
        this.observer = new Observer();
        this._scan(this.el);
        this._transformToString = this._transformToString.bind(this)
        this.observer.build();


//        console.log(this.methods.greet())
    }

    getData() {
        return this.data;
    }

    _scanEvents(node) {
        let events = [];
        Array.from(node.attributes).forEach(attr => attr.name.indexOf('sec-on') >= 0 && events.push(attr))
        return events;
    }

    _scan(node) {
        if (node === this.el || !node.getAttribute('sec-li')) {
            for (let i = 0; i < node.children.length; i++) {
                const _thisNode = node.children[i]
                this._parseModel(_thisNode);
//            this.parseClass(node)
                this._parseEvents(_thisNode)
                if (_thisNode.children.length) {
                    arguments.callee(_thisNode)
                }
            }
        } else {
//          this.parseList(node)
        }

    }

    _transformToArray(node) {
        let isInput = node.tagName === 'INPUT';
        let _data = isInput ? node.value : node.innerText;
        return this._parseInnerText(_data);
    }

    _transformToString(array, key, value) {
        let result = '';
        let data = this.data;
        array.forEach((d) => {
            result += (d.type === 'string' ? d.value : (key && key === d.value.trim()) ? value : data[d.value.trim()])
        })
        return result;
    }

    _parseModel(node) {
        let isInput = node.tagName === 'INPUT';
        let array = this._transformToArray(node);
        let result = this._transformToString(array);
        let setNodeValue = (isInput, value) => {
            if (isInput) {
                node.value = value;
            } else {
                node.innerText = value;
            }
        }
        array.forEach((d) => {
            if (d.type === 'object') {
                this.observer.regist(this.data, d.value.trim(), (old, now) => {
                    let r = this._transformToString(array, d.value.trim(), now);
                    setNodeValue(isInput, r);
                });
            }
        })
        setNodeValue(isInput, result);
    }

    _parseEvents(node) {
        this._scanEvents(node).forEach(event => this._parseEvent(node, event))
    }

    _parseEvent(node, event) {
        const eventName = event.name;
        const type = eventName.substring(eventName.indexOf(':') + 1);
        const fn = this.methods[event.value];
        if (type === 'input') {
            let cmp = false;
            node.addEventListener('compositionstart', () => {
                cmp = true;
            });
            node.addEventListener('compositionend', () => {
                cmp = false;
                node.dispatchEvent(new Event('input'));
            });
            node.addEventListener('input', function input(e) {
                if (!cmp) {
                    const start = this.selectionStart;
                    const end = this.selectionEnd;
                    fn(e);
                    this.setSelectionRange(start, end);
                }
            });
        } else {
            node.addEventListener(type, fn);
        }
    }

    _parseInnerText(str) {
        let begin = '{{'
        let end = '}}';
        let result = [];
        while (str.indexOf(begin) >= 0 && str.indexOf(end) >= 0) {
            result.push({
                type: 'string',
                value: str.substring(0, str.indexOf(begin))
            });
            result.push({
                type: 'object',
                value: str.substring(str.indexOf(begin) + 2, str.indexOf(end))
            });
            str = str.substring(str.indexOf(end) + 2);
        }
        result.push({
            type: 'string',
            value: str
        });
        return result;
    }

}


class Observer {
    constructor() {
        this.routes = [];
    }

    regist(obj, k, fn) {
        const route = this.routes.find((el) => {
            let result;
            if ((el.key === k || el.key.toString() === k.toString())
                && Object.is(el.obj, obj)) {
                result = el;
            }
            return result;
        });
        if (route) {
            route.fn.push(fn);
        } else {
            this.routes.push({
                obj,
                key: k,
                fn: [fn],
            });
        }
    }

    build() {
        this.routes.forEach((route) => {
            this.observer(route.obj, route.key, route.fn);
        });
    }

    observer(obj, k, callback) {

        let old = obj[k];
        if (!old) {
            throw new Error('The key to observe is undefined.');
        }

        Object.defineProperty(obj, k, {
            enumerable: true,
            configurable: true,
            get: () => old,
            set: (now) => {
                if (now !== old) {
                    callback.forEach((fn) => {
                        fn(old, now);
                    });
                }
                old = now;
            },
        });
    }
}
