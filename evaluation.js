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
Object.defineProperty(Array.prototype, 'shuffle',{
    value:function() {
        var j, x, i;
        for (i = this.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            x = this[i];
            this[i] = this[j];
            this[j] = x;
        }
        return this;
    }
});

/**
 * @typedef Doc
 * @type {object}
 * @property {boolean} relevant
 * @property {boolean} retrieved
 * @property {?string} id
 */

/**
 * @typedef RetrievedDoc
 * @type {Doc}
 * @property {number} rank
 * @property {number} precision
 * @property {number} recall
 */

/**
 * 
 * @param {RetrievedDoc[]} retrieveds 
 * @param {number} nbRelevant
 */
function calculateRankPrecisionAndRecall(retrieveds, nbRelevant) {
    let nbRetrievedRelevant = 0;
    for(let i = 0; i < retrieveds.length; i++) {
        let d = retrieveds[i];
        if (d.relevant) {
            nbRetrievedRelevant++;
        }
        d.precision = nbRetrievedRelevant / (d.rank + 1); 
        d.recall = nbRetrievedRelevant / nbRelevant;
    }
}

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

/**
 * 
 * @param {InformationRetrievalQuery} irq 
 */
function displayStatistics(irq) {
    d3.select('#number_docs.value')
        .text( `${irq.nbDoc}+` );
    d3.select('#number_retrieved')
        .property("value", irq.nbRetrieved);
    d3.select('#number_retrieved_relevant.value')
        .text( irq.nbRetrievedRelevant );
    d3.select('#number_relevant')
        .property("min", irq.nbRetrievedRelevant )
        .property("value", irq.nbRelevant);
    d3.select('#query_recall.value')
        .text( irq.recall.toFixed(2) );
    d3.select('#query_precision.value')
        .text( irq.precision.toFixed(2) );
    d3.select('#query_ap.value')
        .text( irq.averagePrecision.toFixed(2) );
    d3.select('#query_rprecision.value')
        .text( irq.rPrecision.toFixed(2) );
}

/**
 * 
 * @param {Doc} doc 
 */
function displayId(doc) {
    return doc.retrieved ? doc.id : "?";
}

/**
 * 
 * @param {InformationRetrievalQuery} irq 
 * @param {*} update 
 */
function displayDocs(irq, update) {
    let ds = d3.select('#all_docs')
      .selectAll('div.doc')
      .data(irq.docs, d => d.id)
      .join(
        enter => enter.append("div")
            .attr('class', 'doc')
            .text(displayId)
          .on('click', function(d) {
            if (d.retrieved) {
              irq.toggleRank(d.rank);
              update();
            }
          })
      )
        .attr('retrieved', d => d.retrieved)
        .attr('relevant', d => d.relevant);
}

/**
 * 
 * @param {InformationRetrievalQuery} irq 
 */
function displayRelevants(irq) {
    let ds = d3.select('#relevant_docs')
      .selectAll('div.doc')
      .data(irq.relevants, d => d.id)
      .join(
        enter => enter.append("div")
            .attr('class', 'doc')
            .attr('docId', d => d.id)
            .text(displayId)
      )
        .attr('retrieved', d => d.retrieved)
        .attr('relevant', d => d.relevant);
}

/**
 * 
 * @param {InformationRetrievalQuery} irq 
 */
function displayRetrieveds(irq) {
    let ds = d3.select('#retrieved_docs')
      .selectAll('.doc_detail')
      .data(irq.retrieveds, d => d.id)
      .join(
        enter => enter.append('div')
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
                .text(displayId);
            d3.select(this)
              .append('div')
                .attr("class", "rank_precision");
            d3.select(this)
              .append('div')
                .attr("class", "rank_recall");
          })
      )
      .each(function (n, i) {
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
      .join(
        enter => enter.append("circle")
            .attr("class", "dot")
            .attr("r", 4)
            .attr('docId', d => d.id)
      )
        .attr("cx", d => graph.x(d.recall))
        .attr("cy", d => graph.y(d.precision))
        .attr('retrieved', d => d.retrieved)
        .attr('relevant', d => d.relevant);

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
        .attr("y1", () => graph.y(-0.05))
        .attr("y2", () => graph.y(1.05))
        .style("visibility", () => (step == 0) ? 'hidden' : 'visible');

    graph.svg.selectAll(".srl")
      .data(stdRecallLevels)
      .join(
        enter => enter.append("path")
            .attr("class", "srl")
            .attr("d", d3.symbol().type(d3.symbolSquare).size(40))
      )
        .attr("transform", function(d, i) { return "translate(" +  graph.x(i / 10) + "," + graph.y(d) + ")"; })
        .style("visibility", () => (step == 0) ? 'hidden' : 'visible')
    
    graph.svg.select(".interpolation_line")
      .datum(interpolation, d => d.id)
        .attr("d", graph.lineMax)
        .style("visibility", () => (step == 0) ? 'hidden' : 'visible');
}

const RELEVANT_CHAR = "R";
const NONRELEVANT_CHAR = "N";
/**
 * 
 * @param {Doc} docs
 * @returns {string}
 */
function docs2retstr(docs) {
    return docs.filter(d => d.retrieved)
        .map(d => (d.relevant) ? RELEVANT_CHAR : NONRELEVANT_CHAR)
        .join("")
}

/**
 * 
 * @param {string} str
 * @returns {Doc}
 */
function retstr2docs(str) {
    return str.split("").map(c => ({
        relevant: (c === RELEVANT_CHAR),
        retrieved: true
    }))
}

/**
 * 
 * @param {string} ret 
 */
function validateRet(ret) {
    let foreign = ret.replace(new RegExp(RELEVANT_CHAR, 'g'), "")
                     .replace(new RegExp(NONRELEVANT_CHAR, 'g'), "");
    return (foreign.length === 0);
}

const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
const ID_LOG_BASE = Math.log(ID_CHARS.length)
/**
 * 
 * @param {number} max
 * @returns {string[]}
 */
function generateIds(max) {
    let nFull = Math.floor(max / ID_CHARS.length);
    let nRemain = max % ID_CHARS.length;

    let ids = Array.from({ length: nFull }, () => ID_CHARS).flat().concat(ID_CHARS.slice(0, nRemain));
    let offset = ID_CHARS.length;
    let nRepeat = offset;

    while(nFull !== 0) {
        let nTake = ids.length - offset - nFull * nRepeat;
        nRemain = nFull % ID_CHARS.length;
        nFull = Math.floor(nFull / ID_CHARS.length);

        // Should not need to generate everything when only parts are used.
        let repeat = ID_CHARS.map(c => Array(nRepeat).fill(c)).flat();
        let prefixes = Array.from({ length: nFull }, () => repeat).flat().concat(repeat.slice(0, nTake));
        
        for(let i = offset, j = 0; i < ids.length; i++, j++) {
            ids[i] = prefixes[j] + ids[i];
        }
        nRepeat *= ID_CHARS.length;
        offset += nRepeat;
    }

    return ids;
}

/**
 * 
 * @param {Doc} docs 
 * @param {string} prefix 
 */
function applyIds(docs, prefix) {
    let ids = generateIds(docs.length);
    docs.forEach(function(doc, i) {
        doc.id = prefix + ids[i];
    });
}

class InformationRetrievalQuery {
    constructor(ret, nbRelevant) {
        this.setState(ret, nbRelevant);
    }

    updateNbRelevant(val) {
        this.setState(this.ret, val);
        this.changed();
    }

    updateNbRetrieved(val) {
        let retrieveds = this.retrieveds;
        if (val < this.nbRetrieved) {
            retrieveds = retrieveds.slice(0, val)
        } else {
            retrieveds = retrieveds.concat(Array(val - this.nbRetrieved).fill().map(() => ({ retrieved: true, relevant: false })))
        }

        this.setState(docs2retstr(retrieveds), this.nbRelevant);
        this.changed();
    }

    toggleRank(rank) {
        let d = this.retrieveds[rank];
        let diff = d.relevant ? -1: 1;
        let nbRetrievedRelevant = this.nbRetrievedRelevant + diff;
        let nbRelevant = this.nbRelevant;

        if (nbRetrievedRelevant > this.nbRelevant) {
            nbRelevant += diff;
        }
        d.relevant = !d.relevant;

        this.setState(this.ret, nbRelevant)

        this.changed()
    }

    setState(ret, nbRelevant) {
        let retrieveds = retstr2docs(ret);
        applyIds(retrieveds, "");

        // Assign rank to retrieved
        retrieveds.forEach((d, i) => d.rank = i);

        // Calculate precision and recall at rank
        calculateRankPrecisionAndRecall(retrieveds, nbRelevant);

        /**
         * @type {RetrievedDoc[]}
         */
        this.retrieveds = retrieveds;

        /**
         * @type {RetrievedDoc[]}
         */
        this.retrievedRelevants = this.retrieveds.filter(d => d.relevant);

        this.setNbRelevant(nbRelevant);
    }

    setNbRelevant(nbRelevant) {
        /**
         * @type {Doc[]}
         */
        this.notRetrievedRelevants = Array(nbRelevant - this.retrievedRelevants.length).fill()
            .map(_ => ({
                retrieved: false,
                relevant: true
            }))
        applyIds(this.notRetrievedRelevants, "-");

        /**
         * @type {Doc[]}
         */
        this.relevants = this.retrievedRelevants.concat(this.notRetrievedRelevants);
        
        /**
         * @type {Doc[]}
         */
        this.docs = this.retrieveds.concat(this.notRetrievedRelevants);
    }

    changed() {
        history.pushState({
            retrieveds: this.ret,
            nbRelevant: this.nbRelevant
        }, "", this.link);
    }

    get ret() {
        return docs2retstr(this.retrieveds);
    }

    get nbRetrieved() {
        return this.retrieveds.length;
    }

    get nbRetrievedRelevant() {
        return this.retrievedRelevants.length;
    }

    get nbRelevant() {
        return this.relevants.length;
    }

    get nbDoc() {
        return this.docs.length;
    }

    get link() {
        return `?ret=${docs2retstr(this.retrieveds)}&nrels=${this.nbRelevant}`
    }

    get precision() {
        return this.nbRetrievedRelevant / this.nbRetrieved;
    }

    get recall() {
        return this.nbRetrievedRelevant / this.nbRelevant;
    }

    get averagePrecision() {
        return this.retrievedRelevants.reduce((acc,cur) => acc + cur.precision, 0) / this.nbRelevant
    }

    get rPrecision() {
        let rPrecision = NaN;
        if (this.nbRetrieved > 0 && this.nbRelevant > 0) {
            rPrecision = this.retrieveds[Math.min(this.nbRelevant, this.nbRetrieved) - 1].precision;
        }
        return rPrecision;
    }
}

/**
 * 
 * @param {string} queryString 
 */
function validateParams(queryString) {
    let urlParams = new URLSearchParams(queryString);
    let ret = urlParams.get("ret");
    let nrels = urlParams.get("nrels");
    let preMsg = ""

    if (ret === null) {
        if (nrels === null || nrels < 0) {
            // All missing
            // Suggest default values
            nrels = 7;
            ret = "NNRNNRRRNN";
            preMsg = `<p>You must provide a sequence of retrieved documents (<code>ret</code>) and the number of relevant documents (<code>nrels</code>) in the collection.</p>`
        } else {
            // Only nrels
            if (nrels < 4) {
                ret = Array.from({ length: nrels }, () => "R").concat(Array.from({ length: 10 - nrels }, () => "N")).shuffle().join("")
            } else {
                ret = "NNRNNRRRNN";
            }
            preMsg = `<p>You must provide a sequence of retrieved documents (<code>ret</code>).</p>`
        }
        let link = `?ret=${ret}&nrels=${nrels}`
        return {
            err: true,
            msg:  preMsg +
                 `<p>For example <code><a href="${link}">${link}</a></code>. <code>${RELEVANT_CHAR}</code> indicating a relevant retrieved document and <code>${NONRELEVANT_CHAR}</code> indicating a non-relevant retrieved document.</p>` +
                 `<p><code>nrels</code> must be greater than or equals to the number of <code>${RELEVANT_CHAR}</code> in <code>ret</code></p>`
        }
    } else {
        // Everything is present
        ret = ret.toUpperCase();
        if (validateRet(ret)) {
            let retrieveds = retstr2docs(ret);
            let retrievedRelevants = retrieveds.filter(d => d.relevant);
            let nretrels = retrievedRelevants.length

            if (nrels === null) {
                // Only ret
                // Suggest nrels >= nretrels
                nrels = nretrels;
                let link = `?ret=${ret}&nrels=${nrels}`;
                return {
                    err: true,
                    msg: `<p>You must provide the number or relevant documents in the collection with the variable <code>nrels</code>.</p>` + 
                         `<p>If you keep <code>ret</code> the same, then <code>nrels</code> must be greater than or equal to ${nrels}</code>. For example <code><a href="${link}">${link}</a></code></p>`
                }
            } else {
                if (nretrels > nrels) {
                    let link = `?ret=${ret}&nrels=${nretrels}`
                    // To few relevants
                    return {
                        err: true,
                        msg: `<p>The number of relevant documents in the collection <code>nrels</code> must be greater than or equal to the number of retrieved relevant documents (<code>${nretrels}</code>)</p>` +
                        `<p>For example <code><a href="${link}">${link}</a></code>.</p>`
                    }
                }

                return {
                    err: false,
                    irq: new InformationRetrievalQuery(ret, nrels)
                };
            }
        } else {
            return {
                err: true,
                msg: `<p><code>ret</code> is not valid, it must contains only <code>${RELEVANT_CHAR}</code> and <code>${NONRELEVANT_CHAR}</code></p>`
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", function(e) {
    let validation = validateParams(window.location.search);
    if (validation.err) {
        // Show error message
        d3.select('#msg')
          .append("div")
            .attr("class", "alert alert-warning")
            .html(validation.msg);
    } else {
        let irq = validation.irq;

        window.onpopstate = function(event) {
            irq.setState(event.state.retrieveds, event.state.nbRelevant);
            update();
        };

        d3.select('#number_retrieved')
          .on("change", function() {
            let nbRetrieved = d3.select(this).property("value");
            irq.updateNbRetrieved(nbRetrieved);
            update();
          })
        
        d3.select('#number_relevant')
          .on("change", function() {
            let nbRelevant = d3.select(this).property("value");
            irq.updateNbRelevant(nbRelevant);
            update();
          })
            .attr("value", irq.nbRelevant)
            .attr("min", irq.nbRetrievedRelevant );

        let useFormula = false;
        d3.select('#use_formula_input')
          .on("change", function() {
            useFormula = !useFormula;
            update();
          });


        // Recall-precision graph
        let g = createRecallPrecisionGraph();

        function update() {
            // Display values
            displayDocs(irq, update);
            displayRelevants(irq);
            displayRetrieveds(irq);
            displayStatistics(irq);

            // Recall-precision graph
            let step = parseInt(d3.select('#standard_recall_level_step').property("value"));
            let max = useFormula ? 11 : irq.nbRetrievedRelevant + 1;

            let stepInput = d3.select('#standard_recall_level_step')
              .on("change", function() {
                let step = parseInt(d3.select(this).property("value"));
                drawRecallPrecisionGraph(g, step, useFormula, irq.retrieveds, irq.retrievedRelevants);
              })
                .attr("max", max);
            if(step > max) {
                stepInput.property("value", max);
                step = max;
            }
            drawRecallPrecisionGraph(g, step, useFormula, irq.retrieveds, irq.retrievedRelevants);
        }
        
        update();
    }
});
