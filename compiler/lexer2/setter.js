
function processSetter(subcontext, equator_index) {
    if(equator_index==0) 
        throw(`CompileException: Unexpected ':' at `+
            `line ${subcontext[1][0][2][0].line} `+
            `column ${subcontext[1][0][2][0].column}`);

    let attributes = subcontext[1].slice(0, equator_index);
    let value_array = subcontext[1].slice(equator_index+1);



    let setter = new SetterContext();

    let processed_attributes = processAttributes(attributes);
    setter.setter_type = processed_attributes.type;
    setter.setter_flags = processed_attributes.flags;
    setter.feeds = processed_attributes.feeds;

    setter.feed_value = processValue(value_array);


    return setter;
}