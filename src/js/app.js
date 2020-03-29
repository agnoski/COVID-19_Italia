async function getDataRegions(url) {
  try {
    const response = await fetch(url);
    const jsonRest = await response.json();

    return jsonRest;
  } catch (error) {
    console.log(error);
  }
}

function getDataRegion(regions, regionName) {
  return regions.filter(region => region["denominazione_regione"] === regionName);
}

function augmentData(regionData) {
  regionData.forEach((dataRaw, i) => {
    const regionKey = findRegion(dataRaw["denominazione_regione"]);

    const people = regionsInfo[regionKey].people;

    dataRaw["tamponi_su_popolazione"] = getPercentage(dataRaw["tamponi"], people);

    dataRaw["totale_casi_su_tamponi"] = getPercentage(dataRaw["totale_casi"], dataRaw["tamponi"]);
    dataRaw["totale_casi_su_popolazione"] = getPercentage(dataRaw["totale_casi"], people);

    dataRaw["deceduti_su_totale_casi"] = getPercentage(dataRaw["deceduti"], dataRaw["totale_casi"]);
    dataRaw["deceduti_su_popolazione"] = getPercentage(dataRaw["deceduti"], people);

    dataRaw["dimessi_guariti_su_totale_casi"] = getPercentage(dataRaw["dimessi_guariti"], dataRaw["totale_casi"]);
    dataRaw["totale_ospedalizzati_su_popolazione"] = getPercentage(dataRaw["totale_ospedalizzati"], people);

    dataRaw["delta_totale_casi"] = getDelta(i, regionData, "totale_casi");
    dataRaw["delta_totale_ospedalizzati"] = getDelta(i, regionData, "totale_ospedalizzati");
    dataRaw["delta_deceduti"] = getDelta(i, regionData, "deceduti");
    dataRaw["delta_dimessi_guariti"] = getDelta(i, regionData, "dimessi_guariti");
    dataRaw["delta_tamponi"] = getDelta(i, regionData, "tamponi");

    dataRaw["delta_totale_casi_su_popolazione"] = getPercentage(dataRaw["delta_totale_casi"], people);

  });
  return regionData;
}

function getPercentage(num, div) {
  return 100.0 * (num / div)
}

function getDelta(i, dataArray, key) {
  return i === 0 ? 0 : dataArray[i][key] - dataArray[i - 1][key];
}

function getXYDataPoints(data, varName) {
  const X = data.map(elem => elem["data"]);
  const Y = data.map(elem => elem[varName]);
  return [X, Y]; 
}

function plotData(X, Y, plotName) {
  const data = {
    x: X,
    y: Y,
    mode: "lines+markers",
    type: "scatter",
    name: plotName
  };

  return data;
}

function getXYDataForFit(X, Y) {
  const data = [];
  Y.forEach((y, i) => {
    data.push([Y[i], y]);
  });
  return data;
}

function doRegression(fitDataPoints) {
  const regressionData = regression('exponential', fitDataPoints);
  return regressionData;
}

function getYFromRegression(regressionData) {
  return regressionData.points.map(elem => elem[1]);
}

function plotRegressionData(X, Y) {
  const data = {
    x: X,
    y: Y,
    mode: 'lines',
    type: 'scatter',
    name: 'Fit',
    line: {
      dash: 'dot',
      width: 1
    }
  };

  return data;
}

function plotDataHTML(plotTitle, data, divName) {
  const layout = {
    title: plotTitle
  };

  const config = {responsive: true}
  
  Plotly.newPlot(divName, data, layout, config);
}

function getPlotDataForSingleRegion(regions, regionName, variableKey) {
    const regionDataOrig = getDataRegion(regions, regionName);
    const regionData = augmentData(regionDataOrig);
    const datapoints = getXYDataPoints(regionData, variableKey);
    const plotdata = plotData(...datapoints, regionName);
    return plotdata;
}

function plotAllRegions(regions, variableKey) {
  const allPlotData = Object.values(regionsInfo).map( region => {
    return getPlotDataForSingleRegion(regions, region.name, variableKey);
  });
  plotDataHTML(variablesInfo[variableKey].name, allPlotData, "allRegionsDiv");
}

function showPlot() {
  const URL = "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-regioni.json";
  const regionName = $("#regions option:selected").html();
  const varName = $("#variables").val();
  const varText = $("#variables option:selected").html();
  const regionsData = getDataRegions(URL);
  regionsData.then(regions => {
    const regionDataOrig = getDataRegion(regions, regionName);
    console.log(regionDataOrig);
    const regionData = augmentData(regionDataOrig);
    console.log(regionData);
    const datapoints = getXYDataPoints(regionData, varName);
    console.log(datapoints);
    const plotdata = plotData(...datapoints, varText);
    console.log(plotdata);
    const fitDataPoints = getXYDataForFit(...datapoints);
    console.log(fitDataPoints);
    const regressionData = doRegression(fitDataPoints);
    console.log(regressionData);
    const YRegressionData = getYFromRegression(regressionData);
    console.log(YRegressionData);
    const plotregressiondata = plotRegressionData(datapoints[0], YRegressionData);
    console.log(plotregressiondata);
    plotDataHTML(varText, [plotdata, plotregressiondata], "singleRegionDiv");
    plotAllRegions(regions, varName);
  }).catch(error => {
    console.log(error);
  });
}

function populateRegionsSelect() {
  Object.keys(regionsInfo).forEach( regionKey => {
    $('#regions').append($('<option>').val(regionKey).text(regionsInfo[regionKey].name))
  });
}

function populateVariablesSelect() {
  Object.keys(variablesInfo).forEach( variableKey => {
    $('#variables').append($('<option>').val(variableKey).text(variablesInfo[variableKey].name))
  });
}

function findRegion(regionName) {
  const regionInfo = Object.entries(regionsInfo).filter(region => region[1].name === regionName);
  return regionInfo[0][0];
}

function initBodyHTML() {
  populateRegionsSelect();
  populateVariablesSelect();
}

$(document).ready(function() {
    initBodyHTML();
});