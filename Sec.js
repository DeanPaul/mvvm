class Sec {
    constructor(v) {
        if (!v.el || !v.data) {
            throw new Error('need an object to observe.');
        }
        this.data = v.data;
        this.el = document.querySelector(v.el);
        this.$register = new Register();
        this.scan(this.el);
        this.transformToString = this.transformToString.bind(this)
        this.$register.build();
        this.methods = v.methods;
    }
    scan(node) {
      if(node === this.el || !node.getAttribute('sec-li')) {

          for(let i = 0; i < node.children.length; i++) {
            const _thisNode = node.children[i]
            this.parseModel(_thisNode);
//            this.parseClass(node)
            this.parseEvent(_thisNode)
            if(_thisNode.children.length) {
              arguments.callee(_thisNode)
            }
          }
        } else {
//          this.parseList(node)
        }

    }
    getData(){ return this.data;}
    transformToArray(node){
        let isInput = node.tagName === 'INPUT';
        let _data = isInput ? node.value : node.innerText;
        return this.parseInnerText(_data);
    }

    transformToString(array,key,value){
        let result = '';
        let data = this.data;
        array.forEach((d) => {
            result += (d.type === 'string' ? d.value : (key&&key===d.value.trim())?value:data[d.value.trim()])
        })
        return result;
    }

    parseModel(node) {
        let isInput = node.tagName === 'INPUT';
        let array = this.transformToArray(node);
        let result = this.transformToString(array);
        let setNodeValue = (isInput,value)=>{
            if (isInput) {
                node.value = value;
            } else {
                node.innerText = value;
            }
        }
        array.forEach((d) => {
            if(d.type === 'object') {
                this.$register.regist(this.data, d.value.trim(), (old, now) => {
                     let r = this.transformToString(array,d.value.trim(),now);
                     setNodeValue(isInput,r);
                });
            }
        })
        setNodeValue(isInput,result);
    }
    parseEvent(){}
    parseInnerText(str){
        let begin = '{{'
        let end = '}}';
        let result = [];
        while(str.indexOf(begin)>=0 && str.indexOf(end)>=0){
            result.push({
                type:'string',
                value:str.substring(0,str.indexOf(begin))
                });
            result.push({
                type:'object',
                value:str.substring(str.indexOf(begin)+2,str.indexOf(end))
                });
            str = str.substring(str.indexOf(end) + 2);
        }
        result.push({
            type:'string',
            value:str
        });
        return result;
    }

}

class Register {
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
