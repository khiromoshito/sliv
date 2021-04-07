
function evaluateDirectValue(directvalue = new DirectValue(), address = "root", deep = true, instance) {
    switch(directvalue.value_type) {
        case DirectValueType.VARIABLE:
            return deep ? 
                extractVariable(directvalue.value, address, directvalue.start, instance) : 
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


function getDirectValueType(value) {
    if(typeof(value)==="string") return DirectValueType.STRING;
    if(typeof(value)==="number") return DirectValueType.NUMBER;
    if(typeof(value)==="boolean") return DirectValueType.BOOL;
    if(value===null || value==="null") return DirectValueType.NULL;

    return "";
}