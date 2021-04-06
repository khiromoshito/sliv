
function evaluateDirectValue(directvalue = new DirectValue(), address = "root", deep = true) {
    switch(directvalue.value_type) {
        case DirectValueType.VARIABLE:
            return deep ? 
                extractVariable(directvalue.value, address, directvalue.start) : 
                directvalue;
        case DirectValueType.STRING:
            return new Crumb([], directvalue.value, address);
        case DirectValueType.NUMBER:
            return new Crumb([], directvalue.value, address);
        case DirectValueType.BOOL:
            return new Crumb([], directvalue.value, address);
        case DirectValueType.NULL:
            return new Crumb([], null, address);
    }
}