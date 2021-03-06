


function evaluateValue(valuecontext, address = "root", deep = true, instance) {



    if(valuecontext===undefined) return nullCrumb();

    // If valuecontext is already a crumb, return it instantly

    if(valuecontext.type.isOf(ContextType.CRUMB))
        return valuecontext;
    
    

    // Or if it is a raw scope, returned a crumb from it
    if(valuecontext.type.isOf(ContextType.SCOPE)) 
        return new ScopeCrumb(valuecontext, address);

    // Or if it is a command
    
    if(valuecontext.type.isOf(ContextType.COMMAND))
        return executeCommand(valuecontext, address);


    switch(valuecontext.type) {

        case ContextType.DIRECT_VALUE:
            return evaluateDirectValue(valuecontext, address, deep, instance);
    
        case ContextType.CALL:
            return evaluateCallChain(valuecontext, address);

        case ContextType.OPERATION:
            return evaluateOperation(valuecontext, address);

        case ContextType.VALUE:
            if(hasFlag(valuecontext.value_flags || [], "instance"))
                return evaluateInstance(valuecontext, address);
            else return evaluateValue(valuecontext.value, address, deep);

        case ContextType.COMPARE:
            return evaluateCompare(valuecontext, address);

        case ContextType.LOGIC:
            return evaluateLogic(valuecontext, address);

    }

    return nullCrumb();

}