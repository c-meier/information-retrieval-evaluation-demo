Object.defineProperty(Array.prototype, 'span',{
    value:function(selector){
      let m = this.length, i = 0;
  
      let fn = !selector
            ? function(){return true;}
            : (
                typeof selector !== 'function'
                  ? function(x){return x == selector;}
                  : selector
              );
  
      while(!fn(this[i]) && ++i < m);
  
      return [this.slice(0, i), this.slice(i)];
    }
});
Object.defineProperty(Array.prototype, 'last',{
    value:function(){
        var m = this.length;  
        return this[m -1];
    }
});
Object.defineProperty(Array.prototype, 'shuffle',{
    value:function() {
        var j, x, i;
        for (i = this.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            x = this[i];
            this[i] = this[j];
            this[j] = x;
        }
        return this;
    }
});