/**
 * 
 * @param {RetrievedDoc[]} retrievedRelevants 
 */
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

/**
 * 
 * @param {RetrievedDoc[]} relevants 
 */
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

let composants = {};
let config = {};
let parameters = {
    mode: "algorithm",
    step: 0
};
let query;

function create(irq) {
    // Inputs
    composants.modeInput = d3.select('#use_formula_input')
      .on("change", function() {
        updateParam({
            mode: parameters.mode == "algorithm" ? "formula" : "algorithm"
        });
      })
        .property('value', parameters.mode == 'formula');
    composants.stepInput = d3.select('#standard_recall_level_step')
      .on("change", function() {
        updateParam({
            step: parseInt(d3.select(this).property("value"))
        })
      })
        .property('value', parameters.step);

    // Figure
    composants.figure = d3.select("#recall_precision").append("svg");
    composants.graph = composants.figure.append("g");
    composants.xAxis = composants.graph.append("g")
    composants.yAxis = composants.graph.append("g")
    composants.xLabel = composants.graph.append("text")
        .attr("text-anchor", "end")
        .text("Recall");
    composants.yLabel = composants.graph.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .text("Precision");

    // Plot
    composants.recallPrecisionLine = composants.graph.append("path")
        .attr("class", "recall_precision_line");
    composants.separation = composants.graph.append("line")
        .attr("class", "separation");
    composants.interpolationLine = composants.graph.append("path")
        .attr("class", "interpolation_line");
    composants.lineToMax = composants.graph.append("path")
        .attr("class", "line_to_max");

    updateConfig({
        margin: {
            top: 20,
            right: 20,
            bottom: 40,
            left: 60
        },
        width: 460,
        height: 400
    }, irq);
}

function getMax() {
    return parameters.mode == "formula" ? 11 : query.nbRetrievedRelevant + ((query.nbRetrievedRelevant == query.nbRelevant) ? 0 : 1);
}

function update(irq) {
    query = irq;

    if(irq.retrievedRelevants.length > 0) {
        composants.recallPrecisionLine
          .datum(irq.retrieveds)
            .attr("d", config.line);
    } else {
        composants.recallPrecisionLine
            .attr("d", "");
    }

    let retDots = composants.graph.selectAll("circle")
      .data(irq.retrieveds, d => d.id)
      .join(
        enter => enter.append("circle")
            .attr("class", "dot")
            .attr("r", 4)
            .attr('docId', d => d.id)
      )
        .attr("cx", d => config.x(d.recall))
        .attr("cy", d => config.y(d.precision))
        .attr('retrieved', d => d.retrieved)
        .attr('relevant', d => d.relevant);

    updateParam(parameters);
}

function updateConfig(c, irq) {
    config.height = c.height;
    config.width = c.width;
    config.margin = c.margin;

    composants.figure
        .attr("width", config.width + config.margin.left + config.margin.right)
        .attr("height", config.height + config.margin.top + config.margin.bottom);
    composants.graph
        .attr("transform",
              "translate(" + config.margin.left + "," + config.margin.top + ")");

    // Add X axis
    config.x = d3.scaleLinear().domain([0, 1]).range([0, config.width]);
    composants.xAxis
        .attr("transform", "translate(0," + config.height + ")")
      .call(d3.axisBottom(config.x));

    // Add Y axis
    config.y = d3.scaleLinear().domain([0, 1]).range([ config.height, 0]);
    composants.yAxis
      .call(d3.axisLeft(config.y));

    // Add X axis label:
    composants.xLabel
        .attr("x", config.width)
        .attr("y", config.height + config.margin.top + 20);

    // Add Y axis label:
    composants.yLabel
        .attr("y", -config.margin.left+20)
        .attr("x", -config.margin.top);

    config.line = d3.line()
        .x(function(d, i) { return config.x(d.recall); })
        .y(function(d) { return config.y(d.precision); })

    config.lineMax = d3.line()
        .x(function(d, i) { return config.x(d.recall); })
        .y(function(d) { return config.y(d.precision); })
        .curve(d3.curveStepBefore);

    update(irq);
}

function updateParam(p) {
    if('mode' in p) parameters.mode = p.mode;
    if('step' in p) parameters.step = p.step;

    let max = getMax();
    if (parameters.step > max) parameters.step = max;

    let spliceEnd = parameters.mode == "formula" ? query.retrievedRelevants.length : parameters.step;
    let slice = query.retrievedRelevants.slice(0, spliceEnd);
    let interpolation = calculateInterpolationLine(slice);
    let remain = [];
    let stdRecallLevels = calculateStandardRecallLevels(slice);
    let currentRecall = 0;
    let lineToMax = [];
    // Standard Recall Levels
    if (parameters.mode == "formula") {
        currentRecall = Math.max((parameters.step - 1) / 10, 0);
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
        for(let i = parameters.step; i < stdRecallLevels.length; i++) {
            stdRecallLevels[i] = 0;
        }
        if(parameters.step > 0) {
            lineToMax = [
                currentPosition,
                {
                    precision: maxRemain.precision,
                    recall: maxRemain.recall
                }
            ]
        }
    } else {
        currentRecall = interpolation[parameters.step].recall;
    }

    composants.modeInput
        .property('value', parameters.mode == 'formula');
    composants.stepInput
        .property('value', parameters.step)
        .property('max', max);

    composants.lineToMax
      .datum(lineToMax)
        .attr("d", config.lineMax);

    composants.separation
      .datum(currentRecall)
        .attr("x1", d => config.x(d))
        .attr("x2", d => config.x(d))
        .attr("y1", () => config.y(-0.05))
        .attr("y2", () => config.y(1.05))
        .style("visibility", () => (parameters.step == 0) ? 'hidden' : 'visible');

    composants.graph.selectAll(".srl")
      .data(stdRecallLevels)
      .join(
        enter => enter.append("path")
            .attr("class", "srl")
            .attr("d", d3.symbol().type(d3.symbolSquare).size(40))
      )
        .attr("transform", function(d, i) { return "translate(" +  config.x(i / 10) + "," + config.y(d) + ")"; })
        .style("visibility", () => ((parameters.step == 0) ? 'hidden' : 'visible'));
    
    composants.interpolationLine
      .datum(interpolation, d => d.id)
        .attr("d", config.lineMax)
        .style("visibility", () => (parameters.step == 0) ? 'hidden' : 'visible');
}

export {create, update}