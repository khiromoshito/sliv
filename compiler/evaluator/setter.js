
// deep - asserts whether to evaluate value
function executeSetter(settercontext = new SetterContext(), address = "root", deep = true) {
    for(let feed of settercontext.feeds) {

        if(feed.type.isOf(ContextType.DIRECT_VALUE)) {

            let feed_address = getAddress(address, getDirectValueLabel(feed));
            let feed_value = settercontext.feed_value;

            // If feed value is an anonymous scope (no type)
            // if(feed_value.type.isOf(ContextType.SCOPE)) {
            //     if(!hasEitherTypes(feed_value.types, ["List", "Map", "Function", "Class"])) {
            //         console.log("Found anonymous scope");

            //         //processScopeEntries(feed_value, getAddress(address, get));
            //     }
            // }

            setVariable(feed_address, 
                deep ? evaluateValue(settercontext.feed_value, feed_address, false) : 
                    new EntryCrumb(settercontext.feed_value, feed_address));



        } else {

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