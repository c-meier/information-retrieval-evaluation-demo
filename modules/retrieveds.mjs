/**
 * 
 * @param {InformationRetrievalQuery} irq 
 */
function displayStatistics(irq) {
    composants.query_recall
        .text( irq.recall.toFixed(2) );
    composants.query_precision
        .text( irq.precision.toFixed(2) );
    composants.query_ap
        .text( irq.averagePrecision.toFixed(2) );
    composants.query_rprecision
        .text( irq.rPrecision.toFixed(2) );
}

/**
 * 
 * @param {InformationRetrievalQuery} irq 
 */
function displayRetrieveds(irq) {
    composants.retrieved_docs
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
                .text(d => d.id);
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

let composants = {};

function create(irq) {
    composants.retrieved_docs = d3.select('#retrieved_docs');
    
    composants.query_recall = d3.select('#query_recall.value');
    composants.query_precision = d3.select('#query_precision.value');
    composants.query_ap = d3.select('#query_ap.value');
    composants.query_rprecision = d3.select('#query_rprecision.value');

    update(irq);
}

function update(irq) {
    displayStatistics(irq);
    displayRetrieveds(irq);
}

export {create, update}