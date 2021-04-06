
class Crumb extends Context {
    constructor(types, value, address, isPrimitive = true) {
        super(ContextType.CRUMB);

        this.isCrumb = true;
        this.types = types;
        this.value = value;
        this.address = address;
        this.isPrimitive = isPrimitive;
    }
}

class NativeCrumb extends Crumb {
    constructor(func, address) {
        super([], func, address);
        this.type = ContextType.NATIVE_METHOD;
    }
}

class ScopeCrumb extends Crumb {
    constructor(scope, address) {
        super([], scope, address);
        this.type = ContextType.SCOPE_CRUMB;
    }
}

/** A wrapper for crumb which tells the nearest scope to return the crumb */
class ReturnCrumb extends Crumb {
    constructor(crumb, address) {
        super([], crumb, address);
        this.type = ContextType.RETURN_CRUMB;
    }
}



function nullCrumb(address) {
    return new Crumb([], null, address);
}


function extractCrumb(crumb) {
    return crumb.isCrumb ? crumb.value : crumb;
}