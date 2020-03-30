var globalData;

class DataFrame {

  constructor(regionsData) {
    this.regionsData = regionsData;
  }

  getDataRegion(regionName) {
    return this.regionsData.filter(region => region["denominazione_regione"] === regionName);
  }

  augmentData(regionData) {
    regionData.forEach((dataRaw, i) => {
      const regionKey = findRegion(dataRaw["denominazione_regione"]);

      const people = regionsInfo[regionKey].people;

      dataRaw["tamponi_su_popolazione"] = this.getPercentage(dataRaw["tamponi"], people);

      dataRaw["totale_casi_su_tamponi"] = this.getPercentage(dataRaw["totale_casi"], dataRaw["tamponi"]);
      dataRaw["totale_casi_su_popolazione"] = this.getPercentage(dataRaw["totale_casi"], people);

      dataRaw["deceduti_su_totale_casi"] = this.getPercentage(dataRaw["deceduti"], dataRaw["totale_casi"]);
      dataRaw["deceduti_su_popolazione"] = this.getPercentage(dataRaw["deceduti"], people);

      dataRaw["dimessi_guariti_su_totale_casi"] = this.getPercentage(dataRaw["dimessi_guariti"], dataRaw["totale_casi"]);
      dataRaw["totale_ospedalizzati_su_popolazione"] = this.getPercentage(dataRaw["totale_ospedalizzati"], people);

      dataRaw["terapia_intensiva_su_popolazione"] = this.getPercentage(dataRaw["terapia_intensiva"], people);

      dataRaw["delta_totale_casi"] = this.getDelta(i, regionData, "totale_casi");
      dataRaw["delta_totale_ospedalizzati"] = this.getDelta(i, regionData, "totale_ospedalizzati");
      dataRaw["delta_deceduti"] = this.getDelta(i, regionData, "deceduti");
      dataRaw["delta_dimessi_guariti"] = this.getDelta(i, regionData, "dimessi_guariti");
      dataRaw["delta_tamponi"] = this.getDelta(i, regionData, "tamponi");

      dataRaw["delta_totale_casi_su_popolazione"] = this.getPercentage(dataRaw["delta_totale_casi"], people);

    });
    return regionData;
  }

  getPercentage(num, div) {
    return 100.0 * (num / div)
  }

  getDelta(i, dataArray, key) {
    return i === 0 ? 0 : dataArray[i][key] - dataArray[i - 1][key];
  }

  getXYDataPoints(data, varName) {
    const X = data.map(elem => elem["data"]);
    const Y = data.map(elem => elem[varName]);
    return [X, Y]; 
  }

  getPlotData(X, Y, plotName) {
    const data = {
      x: X,
      y: Y,
      mode: "lines+markers",
      type: "scatter",
      name: plotName
    };

    return data;
  }

  getXYDataForFit(X, Y) {
    const data = [];
    Y.forEach((y, i) => {
      data.push([Y[i], y]);
    });
    return data;
  }

  doRegression(fitDataPoints) {
    const regressionData = regression('exponential', fitDataPoints);
    return regressionData;
  }

  getYFromRegression(regressionData) {
    return regressionData.points.map(elem => elem[1]);
  }

  plotRegressionData(X, Y) {
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

  plotDataHTML(plotTitle, data, divName) {
    const layout = {
      title: plotTitle
    };

    const config = {responsive: true}
    
    Plotly.newPlot(divName, data, layout, config);
  }

  getPlotDataForSingleRegion(regionName, variableKey) {
      const regionDataOrig = this.getDataRegion(regionName);
      const regionData = this.augmentData(regionDataOrig);
      const datapoints = this.getXYDataPoints(regionData, variableKey);
      const plotdata = this.getPlotData(...datapoints, regionName);
      return plotdata;
  }

  getPlotDataForRegression(X, Y) {
    const fitDataPoints = this.getXYDataForFit(X, Y);
    const regressionData = this.doRegression(fitDataPoints);
    const YRegressionData = this.getYFromRegression(regressionData);
    const plotregressiondata = this.plotRegressionData(X, YRegressionData);
    return plotregressiondata;
  }

  plotAllRegionsHTML(variableKey) {
    const allPlotData = Object.values(regionsInfo).map( region => {
      return this.getPlotDataForSingleRegion(region.name, variableKey);
    });
    this.plotDataHTML(variablesInfo[variableKey].name, allPlotData, "allRegionsDiv");
  }

  plotSingleRegionHTML(regionName, varName, varText) {
    const plotdata = this.getPlotDataForSingleRegion(regionName, varName);
    console.log(plotdata);
    const plotregressiondata = this.getPlotDataForRegression(plotdata.x, plotdata.y);
    console.log(plotregressiondata);
    this.plotDataHTML(varText, [plotdata, plotregressiondata], "singleRegionDiv");
  }
}

// utils
function findRegion(regionName) {
  const regionInfo = Object.entries(regionsInfo).filter(region => region[1].name === regionName);
  return regionInfo[0][0];
}

async function getDataRegions(url) {
  try {
    const response = await fetch(url);
    const jsonRest = await response.json();

    return jsonRest;
  } catch (error) {
    console.log(error);
  }
}

// html interaction
function showPlot() {
  const regionName = $("#regions option:selected").html();
  const varName = $("#variables").val();
  const varText = $("#variables option:selected").html();
  globalData.plotSingleRegionHTML(regionName, varName, varText);
  globalData.plotAllRegionsHTML(varName);
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

function initBodyHTML() {
  populateRegionsSelect();
  populateVariablesSelect();
}

$(document).ready(function() {
    initBodyHTML();
    const URL = "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-regioni.json";
    const regionsData = getDataRegions(URL);
    regionsData.then(regions => {
      globalData = new DataFrame(regions);
      const varibleKey = $("#variables").val();
      globalData.plotAllRegionsHTML(varibleKey);
    });
});