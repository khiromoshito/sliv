
// deep - asserts whether to evaluate value
function executeSetter(settercontext = new SetterContext(), address = "root", deep = true, instance = undefined) {
    for(let feed of settercontext.feeds) {

        if(feed.type.isOf(ContextType.DIRECT_VALUE)) {

            
            let label = getDirectValueLabel(feed);
            let feed_address = getAddress(address, label);
            let value = deep ? evaluateValue(settercontext.feed_value, feed_address, deep) : 
                new EntryCrumb(settercontext.feed_value, feed_address);

            if(instance!==undefined) {
                instance.props[label] = value;
            } else {
                setVariable(feed_address, value);
            }

            
        } else 
        
        if(feed.type.isOf(ContextType.VALUE)) {

            let feedname_value = evaluateValue(feed.feed_value);
            if(feedname_value.type === ContextType.CRUMB) {

                let label = getDirectValueLabel(getDirectValueType(extractCrumb(feedname_value)));
                let feed_address = getAddress(address, label);

                let value = deep ? evaluateValue(settercontext.feed_value, feed_address, false) : 
                new EntryCrumb(settercontext.feed_value, feed_address);

                if(instance!==undefined) {
                    instance.props[label] = value;
                } else {
                    setVariable(feed_address, value);
                }
            }
            
        } else if(feed.type.isOf(ContextType.CALL)) {

            let last_calltype = feed.call_chain[feed.call_chain.length-1].call_type;

            // // Check if last item is function call
            // if(last_calltype===CallType.FUNCTION) {

            //     let feedname_value = evaluateCallChain(feed, address);
            //     let value = deep ? evaluateValue(settercontext.feed_value, feed_address, false) : 
            //                 new EntryCrumb(settercontext.feed_value, feed_address);

            //     if(feedname_value.type === ContextType.INSTANCE_CRUMB) {
            //         let label = getDirectValueLabel(
            //             new DirectValue(
            //                 getDirectValueType(extractCrumb(feedname_value)),
            //                 );
            //         feedname_value.props[label] = value;
            //     } else
            //     if(feedname_value.type === ContextType.CRUMB) {

            //         let label = getDirectValueLabel(getDirectValueType(extractCrumb(feedname_value)));
            //         let feed_address = getAddress(address, label);

                    
            //         if(instance!==undefined) {
            //             instance.props[label] = value;
            //         } else {
            //             setVariable(feed_address, value);
            //         }
            //     }
            // } else 



            let ref_crumb = evaluateCallChain(feed, address, false);
            let ref_value = extractCrumb(ref_crumb);
            let key = feed.call_chain[feed.call_chain.length-1].value;
            
            if(last_calltype===CallType.PROPERTY) {
                
                
                if(ref_crumb.type.isOf(ContextType.INSTANCE_CRUMB)) {
                    ref_crumb.props[key] = settercontext.feed_value;
                } else
                
                if(ref_value.type !== undefined) {
                    
                    if(ref_value.type.isOf(ContextType.SCOPE)) {
                        let ref_pos = findScopeEntry(ref_value, key, false);

                        let setter = new SetterContext(settercontext.setter_flags, settercontext.setter_type,
                            [new DirectValue(DirectValueType.VARIABLE, key, settercontext.start)], 
                            deep ? evaluateValue(settercontext.feed_value) : settercontext.feed_value);
                        
                        if(ref_pos>=0) {
                            ref_value.contents.splice(ref_pos, 1, setter);
                        } else ref_value.contents.push(setter);
                    } 
                } else throwException(`ScopeException: Trying to set property/entry '${key}' `+
                    `of a non-scope/list/map object`, settercontext.start);
            } else if(last_calltype===CallType.ENTRY) {

                if(ref_crumb.type.isOf(ContextType.INSTANCE_CRUMB)) {
                    key = extractCrumb(evaluateValue(key));
                    let label = getDirectValueLabel(new DirectValue(getDirectValueType(key), key, settercontext.start));
                    ref_crumb.props[label] = settercontext.feed_value;
                    console.log(ref_crumb);
                } else

                if(ref_value.type !== undefined && ref_value.type.isOf(ContextType.SCOPE)) {
                    let ref_pos = findScopeEntry(ref_value, key, false);
                    
                    if(ref_pos!==-1) {
                        ref_value.contents.splice(ref_pos, 1, 
                            new SetterContext(settercontext.setter_flags, settercontext.setter_type,
                            [new DirectValue(getDirectValueType(key), key, settercontext.start)], 
                            deep ? evaluateValue(settercontext.feed_value) : settercontext.feed_value));
                    } else ref_value.contents.push(settercontext);
                } else throwException(`ScopeException: Trying to set property/entry '${key}' `+
                    `of a non-scope/list/map object`, settercontext.start);
                
                //let feed_value = extractCrumb(evaluateCallChain(feed, address));
                
            }
            
        } else
        
        {

            if(variables[getUnnamedAddress(address)]===undefined) 
                variables[getUnnamedAddress(address)] = [];

            variables[getUnnamedAddress(address)].push(evaluateValue(feed));

        }
    }
}



function processScopeEntries(scope = new ScopeContext(), address) {
    let index = 0;
    for(let item of scope.contents) {
        if(item.type.isOf(ContextType.SETTER)) {
            executeSetter(item, address, false);
        } else {
            let entry_address = getDirectValueLabel(new DirectValue("", index++, item.start));
            setVariable(getAddress(address, entry_address), new EntryCrumb(item, entry_address));
        }
    }
}