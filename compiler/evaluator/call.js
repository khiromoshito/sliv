
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
            case CallType.ENTRY:
                //console.log("Calling a property...");

                if(currentCrumb.type.isOf(ContextType.SCOPE_CRUMB)) {
                    currentCrumb = findScopeEntry(currentCrumb.value, 
                        extractCrumb(evaluateValue(call.value)));
                } else {
                    throwException(`ScopeException: Trying to call property/entry '${currentCrumb.value}'`+
                        `of a non-scope/list/map object`, callcontext.start);
                }
                
                
                // let call_address = getAddress(address, )
                // let entry_value = variables[getAddress(address, 
                //     getDirectValueLabel(call.value))]
            break;
        }
    }

    return currentCrumb;
};


function findScopeEntry(scopecontext = new ScopeContext(), key) {
    
    let index = 0;

    for(let item of scopecontext.contents) {
        if(item.type.isOf(ContextType.SETTER)) {
            for(let feed of item.feeds) {
                //console.log(feed.value + " " + key);
                if(feed.value==key) return evaluateValue(item.feed_value);
            }
        } else {
            if(key===index) return evaluateValue(item);
            index++;
        }
    }
    
    return nullCrumb();
}