function evaluateLogic(logiccontext = new LogicContext(), address = "root") {
        
    let left_value = extractCrumb(evaluateValue(logiccontext.left, address));
    let right_value = extractCrumb(evaluateValue(logiccontext.right, address));

    let logic_value = false;

    let areBooleans = function(...values) {
        for(let value of values) if(typeof(value)!=="boolean") return false;
        return true;
    };

    if(!areBooleans(left_value, right_value)) 
        throwException(`LogicException: Only booleans can be passed in && and || conditions, but found:`+
        `\n   ${left_value}\n   ${right_value}`, logiccontext.start);

    switch(logiccontext.logic_type) {
        case LogicType.AND:
            logic_value = left_value && right_value;
        
        case LogicType.OR:
            logic_value = left_value || right_value;
    }

    return new Crumb([], logic_value, address, true);

}