function evaluateInstance(valuecontext = new ValueContext(), address = "root") {
    
    let call = valuecontext.value;
    if(call.type.isOf(ContextType.CALL)) {

        let lastcall = call.call_chain[call.call_chain.length-1];
        if(lastcall.call_type===CallType.FUNCTION) {
            let target_scope = evaluateCallChain(call, address, false);
            
            if(target_scope.type===ContextType.SCOPE_CRUMB) {
                let args = lastcall.value;
                let instance = new InstanceCrumb({},
                    JSON.parse(JSON.stringify(target_scope.value)),
                    address);
                executeScope(instance, getAddress(address, generateAddress()), args, false, true);
                return instance;

            } else throwException(`ClassException: Only scopes/classes can`+
            ` be made into instances`, valuecontext.start);

        } else throwException(`ClassException: Scope/class must be called with argument(s) `+
                `(like a function call) to create an instane`, 
                valuecontext.start);
    } else throwException(`ClassException: Only scopes/classes can`+
        ` be made into instances (make sure it is directly called after the flags)`,
        valuecontext.start);
    //let target_scope = evaluateCallChain(evaluateValue())
}