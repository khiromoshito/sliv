
function evaluateCallChain(callcontext = new CallContext(), address = "root") {
    let currentCrumb = evaluateValue(callcontext.root_value, address);

    for(let call of callcontext.call_chain) {
        switch(call.call_type) {
            case CallType.FUNCTION:

                let args = call.value;

                if(currentCrumb.type==ContextType.NATIVE_METHOD) {

                    // When passing args to native method, 
                    // they must be in crumbs already
                    let crumbArgs = args.map(arg=>evaluateValue(arg.value, address));

                    currentCrumb = currentCrumb.value(crumbArgs);

                } else if(currentCrumb.type.isOf(ContextType.SCOPE_CRUMB)) {
                    let scope_address = getAddress(address, generateAddress());
                    currentCrumb = executeScope(
                        currentCrumb.value, scope_address, args);
                }
            break;
        }
    }

    return currentCrumb;
};