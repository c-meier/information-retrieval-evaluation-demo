// The code
Object.defineProperty(Array.prototype, 'span',{
    value:function(selector){
      var m = this.length, i = 0;
  
      fn = !selector
            ? function(){return true;}
            : (
                typeof selector !== 'function'
                  ? function(x){return x == selector;}
                  : selector
              );
  
      while(!fn(this[i]) && ++i < m);
  
      return [this.slice(0, i), this.slice(i)];
    }
  });
  Object.defineProperty(Array.prototype, 'last',{
    value:function(){
      var m = this.length;  
      return this[m -1];
    }
  });
  

function calculateRankPrecisionAndRecall(retrieveds, relevants) {
    let nbRetrievedRelevant = 0;
    for(let i = 0; i < retrieveds.length; i++) {
        let d = retrieveds[i];
        if (d.relevant) {
            nbRetrievedRelevant++;
        }
        d.precision = nbRetrievedRelevant / (d.rank + 1); 
        d.recall = nbRetrievedRelevant / relevants.length;
    }
}

function calculateStandardRecallLevels(retrievedRelevants) {
    let stdRecallLevels = Array(11).fill(0);
    for(let i = 0; i < retrievedRelevants.length; i++) {
        let d = retrievedRelevants[i]
        
        let index = Math.floor(d.recall * 10);
        for(let j = index; j >= 0; j--) {
            if(stdRecallLevels[j] < d.precision) {
                stdRecallLevels[j] = d.precision;
            } else {
                break;
            }
        }
    }
    return stdRecallLevels;
}

function calculateInterpolationLine(relevants) {
    let interpolation = relevants.map(d => ({...d}));
    for(let i = 0; i < interpolation.length; i++) {
        let d = interpolation[i]
        for(let j = i; j >= 0; j--) {
            if(interpolation[j].precision < d.precision) {
                interpolation[j].precision = d.precision;
            }
        }
    }
    let interpolationLine = [
        {
            id: "first",
            recall: 0,
            precision: interpolation.length > 0 ? interpolation[0].precision : 0
        },
        ...interpolation,
        {
            id: "last",
            recall: 1,
            precision: 0
        }
    ];
    return interpolationLine;
}

function displayStatistics(docs, retrieveds, relevants, retrievedRelevants) {
    d3.select('#number_docs.value')
        .text( docs.length );
    d3.select('#number_relevant.value')
        .text( relevants.length );
    d3.select('#number_retrieved_relevant.value')
        .text( retrievedRelevants.length );
    d3.select('#query_recall.value')
        .text( ( retrievedRelevants.length / relevants.length ).toFixed(2) );
    d3.select('#query_precision.value')
        .text( (retrievedRelevants.length / retrieveds.length).toFixed(2) );
    d3.select('#query_ap.value')
        .text( (retrievedRelevants.reduce((acc,cur) => acc + cur.precision, 0) / relevants.length).toFixed(2) );
    
    let rPrecision = NaN;
    if (retrieveds.length && relevants.length) {
        rPrecision = retrieveds[Math.min(relevants.length, retrieveds.length) - 1].precision;
    }
    d3.select('#query_rprecision.value')
        .text( (rPrecision).toFixed(2) );
}

function displayDocs(docs, update) {
    let ds = d3.select('#all_docs')
        .selectAll('div.doc')
        .data(docs, d => d.id);

    ds.enter()
        .append("div")
        .attr('class', 'doc')
        .on('click', function(d) {
            d.relevant = !d.relevant;
            update();
        })
        .text(d => d.id)
        .attr('retrieved', d => d.retrieved)
        .attr('relevant', d => d.relevant);

    ds.exit()
        .remove();
    
    ds.attr('retrieved', d => d.retrieved)
        .attr('relevant', d => d.relevant);
}

function displayRelevants(relevants) {
    let ds = d3.select('#relevant_docs')
        .selectAll('div.doc')
        .data(relevants, d => d.id);

    ds.enter()
        .append("div")
        .attr('class', 'doc')
        .attr('docId', d => d.id)
        .text(d => d.id)
        .attr('retrieved', d => d.retrieved)
        .attr('relevant', d => d.relevant);

    ds.exit()
        .remove();
    
    ds.attr('retrieved', d => d.retrieved)
        .attr('relevant', d => d.relevant);
}

function displayRetrieveds(retrieveds) {
    let ds = d3.select('#retrieved_docs')
        .selectAll('.doc_detail')
        .data(retrieveds, d => d.id);

    ds.enter()
        .append('div')
        .attr('class', 'doc_detail')
        .each(function (n, i) {
            d3.select(this)
                .append('div')
                .attr("class", "rank")
                .text(d => d.rank);
            d3.select(this)
                .append('div')
                .attr('class', 'doc')
                .attr('docId', d => d.id)
                .text(d => d.id)
                .attr('retrieved', d => d.retrieved)
                .attr('relevant', d => d.relevant);
            d3.select(this)
                .append('div')
                .attr("class", "rank_precision")
                .text(d => d.precision.toFixed(2));
            d3.select(this)
                .append('div')
                .attr("class", "rank_recall")
                .text(d => d.recall.toFixed(2));
        });

    ds.exit()
        .remove();
    
    ds.each(function (n, i) {
        d3.select(this)
            .select('.doc')
            .attr('retrieved', d => d.retrieved)
            .attr('relevant', d => d.relevant);
        d3.select(this)
            .select('.rank_precision')
            .text(d => d.precision.toFixed(2));
        d3.select(this)
            .select('.rank_recall')
            .text(d => d.recall.toFixed(2));
    });
}

function createRecallPrecisionGraph() {
    // set the dimensions and margins of the graph
    const margin = {top: 20, right: 20, bottom: 40, left: 60},
        width = 460 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    // create svg element, respecting margins
    let svg = d3.select("#recall_precision")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");

    // Add X axis
    let x = d3.scaleLinear().domain([0, 1]).range([0, width]);
    svg
      .append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));

    // Add Y axis
    let y = d3.scaleLinear().domain([0, 1]).range([ height, 0]);
    svg
      .append("g")
      .call(d3.axisLeft(y));

    // Add X axis label:
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", width)
        .attr("y", height + margin.top + 20)
        .text("Recall");

    // Add Y axis label:
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left+20)
        .attr("x", -margin.top)
        .text("Precision")


    const line = d3.line()
        .x(function(d, i) { return x(d.recall); }) // set the x values for the line generator
        .y(function(d) { return y(d.precision); }) // set the y values for the line generator 

    const lineMax = d3.line()
        .x(function(d, i) { return x(d.recall); }) // set the x values for the line generator
        .y(function(d) { return y(d.precision); }) // set the y values for the line generator 
        .curve(d3.curveStepBefore);

    // Path for recall-precision
    svg.append("path")
        .attr("class", "recall_precision_line");

    // Separator
    svg.append("line")
        .attr("class", "separation");

    // Interpolation path
    svg.append("path")
        .attr("class", "interpolation_line");

    // Line to max
    svg.append("path")
        .attr("class", "line_to_max");

    return {
        margin,
        svg,
        x,
        y,
        line,
        lineMax
    };
}

function drawRecallPrecisionGraph(graph, step, useFormula, retrieveds, retrievedRelevants) {
    if(retrievedRelevants.length > 0) {
        graph.svg.select(".recall_precision_line")
            .datum(retrieveds)
            .attr("d", graph.line);
    } else {
        graph.svg.select(".recall_precision_line")
            .attr("d", "");
    }

    let retDots = graph.svg.selectAll("circle")
        .data(retrieveds, d => d.id)
    
    retDots.enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => graph.x(d.recall))
        .attr("cy", d => graph.y(d.precision))
        .attr("r", 4)
        .attr('retrieved', d => d.retrieved)
        .attr('relevant', d => d.relevant)
        .attr('docId', d => d.id);

    retDots.exit()
        .remove();

    retDots.attr("cx", d => graph.x(d.recall))
        .attr("cy", d => graph.y(d.precision))
        .attr('retrieved', d => d.retrieved)
        .attr('relevant', d => d.relevant)

    let spliceEnd = useFormula ? retrievedRelevants.length : step;
    let slice = retrievedRelevants.slice(0, spliceEnd);
    let interpolation = calculateInterpolationLine(slice);
    let stdRecallLevels = calculateStandardRecallLevels(slice);
    let currentRecall = 0;
    let lineToMax = [];
    // Standard Recall Levels
    if (useFormula) {
        currentRecall = Math.max((step - 1) / 10, 0);
        [interpolation, remain] = interpolation.span(d => d.recall > currentRecall);
        let maxRemain = remain.reduce(
            (max, v) => v.precision >= max.precision ? v : max, 
            {
                id: "last",
                recall: 1,
                precision: 0
            }
        );
        let currentPosition = {
            precision: maxRemain.precision,
            recall: currentRecall
        }
        interpolation.push(currentPosition)
        for(let i = step; i < stdRecallLevels.length; i++) {
            stdRecallLevels[i] = 0;
        }
        if(step > 0) {
            lineToMax = [
                currentPosition,
                {
                    precision: maxRemain.precision,
                    recall: maxRemain.recall
                }
            ]
        }
    } else {
        currentRecall = interpolation[step].recall;
    }

    graph.svg.select(".line_to_max")
        .datum(lineToMax)
        .attr("d", graph.lineMax);

    graph.svg.select(".separation")
        .datum(currentRecall)
        .attr("x1", d => graph.x(d))
        .attr("x2", d => graph.x(d))
        .attr("y1", d => graph.y(-0.05))
        .attr("y2", d => graph.y(1.05));

    graph.svg.selectAll(".srl")
        .data(stdRecallLevels)
        .attr("transform", function(d, i) { return "translate(" +  graph.x(i / 10) + "," + graph.y(d) + ")"; })
        .enter()
        .append("path")
        .attr("class", "srl")
        .attr("d", d3.symbol().type(d3.symbolSquare).size(40))
        .attr("transform", function(d, i) { return "translate(" +  graph.x(i / 10) + "," + graph.y(d) + ")"; });
    
    graph.svg.select(".interpolation_line")
        .datum(interpolation, d => d.id)
        .attr("d", graph.lineMax);
}

document.addEventListener("DOMContentLoaded", function(e) {
   /* Your D3.js here */
    const NB_DOCS = 26;
    
    // Default documents
    let defaultNbRetrieved = 13;
    let defaultRelevantIds = ['F','C','E','H','M','O','A'];
    let docs = Array(NB_DOCS).fill()
        .map((_, i) => String.fromCharCode('A'.charCodeAt(0) + i))
        .map((id, i) => ({ 
            id: id, 
            retrieved: i < defaultNbRetrieved, 
            relevant: defaultRelevantIds.includes(id) 
        }));

    
    d3.select('#number_retrieved')
        .on("change", function() {
            let nbRetrieved = d3.select(this).property("value");
            for(let i = 0; i < docs.length; i++) {
                docs[i].retrieved = i < nbRetrieved;
            }
            update();
        })
        .attr("value", defaultNbRetrieved );

    let useFormula = false;
    d3.select('#use_formula_input')
        .on("change", function() {
            useFormula = !useFormula;
            update();
        });


    // Recall-precision graph
    let g = createRecallPrecisionGraph();

    function update() {
        let relevants = docs.filter(d => d.relevant);
        let retrieveds = docs.filter(d => d.retrieved);
        let retrievedRelevants = retrieveds.filter(d => d.relevant);

        // Assign rank to retrieved
        retrieveds.forEach((d, i) => d.rank = i);
        docs.filter(d => !d.retrieved).forEach(d => d.rank = undefined);

        // Calculate precision and recall at rank
        calculateRankPrecisionAndRecall(retrieveds, relevants);

        // Display values
        displayDocs(docs, update);
        displayRelevants(relevants);
        displayRetrieveds(retrieveds);
        displayStatistics(docs, retrieveds, relevants, retrievedRelevants);

        // Recall-precision graph
        let step = parseInt(d3.select('#standard_recall_level_step').property("value"));
        let max = useFormula ? 11 : retrievedRelevants.length + 1;

        let stepInput = d3.select('#standard_recall_level_step')
            .on("change", function() {
                let step = parseInt(d3.select(this).property("value"));
                drawRecallPrecisionGraph(g, step, useFormula, retrieveds, retrievedRelevants);
            })
            .attr("max", max);
        if(step > max) {
            stepInput.property("value", max);
            step = max;
        }
        drawRecallPrecisionGraph(g, step, useFormula, retrieveds, retrievedRelevants);
    }
    
    update();

/*
    let recallLevels = Array(11).fill(0);
    for(let i = 0; i < retrieveds.length; i++) {
        let d = retrieveds[i]
        
        let index = Math.floor(d.recall * 10);
        for(let j = index; j >= 0; j--) {
            if(recallLevels[j] < d.precision) {
                recallLevels[j] = d.precision;
            } else {
                break;
            }
        }
    }

    let interpolateds = retrieveds.map(d => ({...d}))
    for(let i = 0; i < interpolateds.length; i++) {
        let d = interpolateds[i]
        for(let j = i; j >= 0; j--) {
            if(interpolateds[j].precision < d.precision) {
                interpolateds[j].precision = d.precision;
                interpolateds[j].modified = true;
            }
        }
    }
    //interpolateds = interpolateds.filter(d => !d.modified)
    let interpolatedsLine = [
        {
            id: "first",
            recall: 0,
            precision: interpolateds[0].precision
        },
        ...interpolateds,
        {
            id: "last",
            recall: 1,
            precision: 0
        }
    ];







    

function standard_recall(svg, step, relevants) {
    let maxPrecision = 0.0;
    let stdRecallLevels = Array(11).fill(0);
    for(let i = 0; i < step && i < relevants.length; i++) {
        let d = relevants[i]
        
        let index = Math.floor(d.recall * 10);
        for(let j = index; j >= 0; j--) {
            if(stdRecallLevels[j] < d.precision) {
                stdRecallLevels[j] = d.precision;
            } else {
                break;
            }
        }
    }
    let interpolation = relevants.map(d => ({...d}));
    for(let i = 0; i < interpolation.length && i < step; i++) {
        let d = interpolation[i]
        for(let j = i; j >= 0; j--) {
            if(interpolation[j].precision < d.precision) {
                interpolation[j].precision = d.precision;
            }
        }
    }
    //interpolateds = interpolateds.filter(d => !d.modified)
    let interpolationLine = [
        {
            id: "first",
            recall: 0,
            precision: interpolation[0].precision
        },
        ...interpolation,
        {
            id: "last",
            recall: 1,
            precision: 0
        }
    ];

    svg.selectAll(".maxPrecision")
        .data([interpolationLine[step]])
        .enter()
        .append("line")
        .attr("class", "maxPrecision")
        .attr("x1", d => x(d.recall))
        .attr("x2", d => x(d.recall))
        .attr("y1", d => y(-0.05))
        .attr("y2", d => y(1.05));

    if(step == 0) {

    } else {


        svg.append("path")
            .datum(interpolationLine.slice(0,step+1), d => d.id)
            .attr("class", "line")
            .attr("d", lineMax);
    }

    svg.selectAll(".srl")
        .data(stdRecallLevels)
        .attr("transform", function(d, i) { return "translate(" +  x(i / 10) + "," + y(d) + ")"; })
        .enter()
        .append("path")
        .attr("class", "srl")
        .attr("d", d3.symbol().type(d3.symbolSquare).size(40))
        .attr("transform", function(d, i) { return "translate(" +  x(i / 10) + "," + y(d) + ")"; });
}


    svg.selectAll(".srl")
        .data(recallLevels)
        .enter()
        .append("path")
        .attr("class", "srl")
        .attr("d", d3.symbol().type(d3.symbolSquare).size(40))
        .attr("transform", function(d, i) { return "translate(" +  x(i / 10) + "," + y(d) + ")"; });

    svg.append("path")
        .datum(interpolatedsLine, d => d.id)
        .attr("class", "line")
        .attr("d", lineMax);

    svg.selectAll("circle")
        .data(interpolateds, d => d.id)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.recall))
        .attr("cy", d => y(d.precision))
        .attr("r", 4)
        .attr('retrieved', d => d.retrieved)
        .attr('relevant', d => d.relevant)
        .attr('docId', d => d.id);

    // create svg element, respecting margins
    let svg2 = d3.select("#recall_precision")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");
    svg2
      .append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));

    svg2
      .append("g")
      .call(d3.axisLeft(y));

    // Add X axis label:
    svg2.append("text")
        .attr("text-anchor", "end")
        .attr("x", width)
        .attr("y", height + margin.top + 20)
        .text("Recall");

    // Y axis label:
    svg2.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left+20)
        .attr("x", -margin.top)
        .text("Precision")

    svg2.append("path")
        .datum(retrieveds, d => d.id)
        .attr("class", "line")
        .attr("d", line);

    svg2.selectAll("circle")
        .data(retrieveds, d => d.id)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.recall))
        .attr("cy", d => y(d.precision))
        .attr("r", 4)
        .attr('retrieved', d => d.retrieved)
        .attr('relevant', d => d.relevant)
        .attr('docId', d => d.id);

    standard_recall(svg2, 4, retrievedRelevants);
*/
});
