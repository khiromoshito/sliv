

function executeSetter(settercontext = new SetterContext(), address = "root") {
    for(let feed of settercontext.feeds) {

        if(feed.type.isOf(ContextType.DIRECT_VALUE)) {

            let feed_address = getAddress(address, getDirectValueLabel(feed));
            setVariable(feed_address, 
                evaluateValue(settercontext.feed_value, feed_address, false));



        } else {

            if(variables[getUnnamedAddress(address)]===undefined) 
                variables[getUnnamedAddress(address)] = [];

            variables[getUnnamedAddress(address)].push(evaluateValue(feed));

        }
    }
};