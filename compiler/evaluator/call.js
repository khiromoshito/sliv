
// if deep is true, what's returned is an evaluated value
// if false, the last command is skipped to return reference
function evaluateCallChain(callcontext = new CallContext(), address = "root", deep = true) {
    let currentValue = evaluateValue(callcontext.root_value, address);

    for(let i = 0; i<callcontext.call_chain.length - (deep ? 0 : 1); i++) {
        
        let call = callcontext.call_chain[i];
        let isLast = (i+1 == callcontext.call_chain.length);
        
        switch(call.call_type) {
            case CallType.FUNCTION:

                let args = call.value;


                if(currentValue.type==ContextType.NATIVE_METHOD) {

                    // When passing args to native method, 
                    // they must be in crumbs already
                    let crumbArgs = args.map(arg=>evaluateValue(arg.value, address));

                    currentValue = currentValue.value(crumbArgs);

                } else if(currentValue.type.isOf(ContextType.SCOPE_CRUMB)) {
                    let scope_address = getAddress(address, generateAddress());
                    currentValue = executeScope(
                        currentValue.value, scope_address, args);
                }
            break;
            case CallType.PROPERTY:
                if(currentValue.type.isOf(ContextType.INSTANCE_CRUMB)) {
                    let value = evaluateValue(currentValue.props[call.value]) || nullCrumb();
                    currentValue = value;
                } else 
                if(currentValue.type.isOf(ContextType.SCOPE_CRUMB)) {
                    currentValue = findScopeEntry(currentValue.value, call.value);
                } else {
                    throwException(`ScopeException: Trying to call property '${currentValue.value}' `+
                        `of a non-scope/list/map object`, call.start);
                }
            break;
            case CallType.ENTRY:
                let key = extractCrumb(evaluateValue(call.value));
                if(currentValue.type.isOf(ContextType.INSTANCE_CRUMB)) {
                    let value = evaluateValue(currentValue.props[
                        getDirectValueLabel(
                            new DirectValue(getDirectValueType(key), key, call.start))
                    ]) || nullCrumb();
                    
                    currentValue = value;
                    
                } else 
                if(currentValue.type.isOf(ContextType.SCOPE_CRUMB)) {
                    currentValue = findScopeEntry(currentValue.value, key);
                } else {
                    throwException(`ScopeException: Trying to call property/entry '${currentValue.value}' `+
                        `of a non-scope/list/map object`, call.start);
                }
            break;
        }
    }

    return currentValue;
};

// isvalue - boolean to assert whether to return value or index
function findScopeEntry(scopecontext = new ScopeContext(), key, isValue = true) {
    
    // General contexts index
    let i = 0;

    // List index
    let index = 0;
    

    for(let item of scopecontext.contents) {

        // Check if current item is countable as an actual item
        if(!hasEitherFlags(item.setter_flags || item.value_flags || [], 
            ["action", "constructor"])) {
            if(item.type.isOf(ContextType.SETTER)) {


                for(let feed of item.feeds) {
                    let feed_value = feed.type.isOf(ContextType.DIRECT_VALUE) ?
                        feed.value : extractCrumb(evaluateValue(feed));
                    if(feed_value==key) return isValue ?  evaluateValue(item.feed_value) : i;
                }

                
            } else {
                if(key===index) return isValue ? evaluateValue(item) : index;
                index++;
            }
        }
        i++;
    }
    
    return isValue ? nullCrumb() : -1;
}