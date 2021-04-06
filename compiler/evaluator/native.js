
let native_methods = {
    print: function(args) {
        let primitives = args.map(arg=>extractCrumb(arg));
        console.log(...primitives);
        
        return new Crumb([], null, "native");
    }
};