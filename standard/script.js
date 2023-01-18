var input_atime;
var input_gain;
var input_led;
var input_go_button;
var input_repeat_read;

var spectral_chart;

var value_atime;
const value_astep = 3596; // (3596+1)*2.78us = 9.99966ms close enough to 10ms
var value_gain;
var value_led;

var label_sensor_read;
var label_gain;
var label_led;

var result_status;
var raw_json;

const spectral_labels = [
  "415nm",
  "445nm",
  "480nm",
  "515nm",
  "555nm",
  "590nm",
  "630nm",
  "680nm"];

// Conversion of F1-F8 wavelengths to RGB via
// https://academo.org/demos/wavelength-to-colour-relationship/
// https://www.johndcook.com/wavelength_to_RGB.html
const spectral_colors = [
  "#7600ED",
  "#0028FF",
  "#00D5FF",
  "#1FFF00",
  "#B3FF00",
  "#FFDF00",
  "#FF4F00",
  "#FF0000"];

// Spectral curve obtained from sunlight, used as
// default reference for normalization
const sunlight_reference = [
  5749,
  6342,
  9533,
  10746,
  11245,
  12577,
  12633,
  15217];

var normalization_curve;
var recalculate_normalization_on_next_read = false;

const devtest = true;

function getURLobject() {
  var espURI;

  if (devtest) {
    // Served from development machine, looking for ESP32 via mDNS name esp32-as7341.local
    espURI = 'http://esp32-as7341.local/';
  } else {
    // When served from ESP32, hostname is our location.
    espURI = window.location.href;
  }

  return new URL('/as7341',espURI);
}

function recalculate_normalization_curve(new_reference) {
  var reference_max = Math.max(...new_reference);

  normalization_curve = new_reference.map(x => reference_max/x);
}

function initiate_read_if_not_repeating() {
  // If we're not in continuous mode, kick off a read.
  if(!input_repeat_read.checked) {
    setTimeout(initiate_read);
  }
}

function reset_normalization_curve() {
  recalculate_normalization_curve(sunlight_reference);
  initiate_read_if_not_repeating();
}

function new_normalization_curve() {
  recalculate_normalization_on_next_read = true;
  initiate_read_if_not_repeating();
}

function direct_data_curve() {
  recalculate_normalization_curve([1,1,1,1,1,1,1,1]);
  initiate_read_if_not_repeating();
}

// Putting information from https://academo.org/demos/wavelength-to-colour-relationship/
// into a spreadsheet:
//
//  nm	Hex	    R	  G	  B
//  415 7600ED  118 0   237
//  445	0028FF  0   40  255
//  480 00D5FF  0   213 255
//  515 1FFFFF  31  255 0
//  555 B3FF00  179 255 0
//  590 FFDF00  255 223 0
//  630 FF4F00  255 79  0
//  680 FF0000  255 0   0
//
//  Sum of all channels: R=1093 G=1065 B=747
//  We see sensors heavy in blue are under-represented.
//  Multiplying 415, 445, 480nm channels by hand-fudged numbers get them within 1%.
//
//  415   1.72  202.96  0       407.64
//  445   1.6   0       64      408
//  480   1.4   0       298.2   357
//  515   1     31      255     0
//  555   1     179     255     0
//  590   1     255     223     0
//  630   1     255     79      0
//  680   1     255     0       0
//              1177.96 1174.2  1172.64

function estimate_hue(normalized_readings) {
  const spectral_rgb = [
    [118, 0,  237],
    [0,   40, 255],
    [0,   213,255],
    [31,  255,  0],
    [179, 255,  0],
    [255, 223,  0],
    [255, 79,   0],
    [255, 0,    0]
  ]
  const correction_rgb = [1.72, 1.6, 1.4, 1, 1, 1, 1, 1];
  var working_rgb=[0,0,0];

  normalized_readings.forEach((reading, index1)=>{
    spectral_rgb[index1].forEach((color, index2)=>{
      working_rgb[index2] += reading*spectral_rgb[index1][index2]*correction_rgb[index1];
    })
  })

  var color_max = Math.max(...working_rgb);
  working_rgb = working_rgb.map(x=>Math.floor(x*255/color_max));

  return `rgb(${working_rgb[0]}, ${working_rgb[1]}, ${working_rgb[2]})`;
}

// Copy/pasted from https://www.chartjs.org/docs/latest/configuration/canvas-background.html#color
const backgroundColorPlugin = {
  id: 'customCanvasBackgroundColor',
  beforeDraw: (chart, args, options) => {
    const {ctx} = chart;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = options.color || '#ffffff';
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  }
};

function contentLoaded() {
  input_atime = document.getElementById('atime');
  input_atime.addEventListener('change', recalculate_parameters);
  input_atime.addEventListener('input', recalculate_parameters);
  input_gain = document.getElementById('gain_power');
  input_gain.addEventListener('change', recalculate_parameters);
  input_gain.addEventListener('input', recalculate_parameters);
  input_led = document.getElementById('led_current');
  input_led.addEventListener('change', recalculate_parameters);
  input_led.addEventListener('input', recalculate_parameters);
  input_repeat_read = document.getElementById('repeat_read');
  input_go_button = document.getElementById('go_button');
  input_go_button.addEventListener('click',initiate_read);
  document.getElementById('current_reference_button').addEventListener('click',new_normalization_curve);
  document.getElementById('sunlight_reference_button').addEventListener('click',reset_normalization_curve);
  document.getElementById('direct_data_button').addEventListener('click',direct_data_curve);

  label_sensor_read = document.getElementById('calculated_time');
  label_gain = document.getElementById('calculated_gain');
  label_led = document.getElementById('calculated_current');

  raw_json = document.getElementById('raw_json');
  result_status = document.getElementById('result_status');

  recalculate_parameters();
  reset_normalization_curve();

  spectral_chart = new Chart(
    document.getElementById('spectral_chart'),
    {
      type: 'bar',
      data: {
        labels: spectral_labels,
        datasets: [{
          data: [0,0,0,0,0,0,0,0,0],
          backgroundColor: spectral_colors,
          borderColor: 'white',
          borderWidth: 2,
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          customCanvasBackgroundColor: {
            color: 'white'
          },
          legend: {
            display: false // Turn off legend
          }
        }, // Turn off legend
        events: [] // Disable interactions (No click/hover/etc.)
      },
      plugins: [backgroundColorPlugin]
    });

  setTimeout(initiate_read);
}

function recalculate_parameters() {
  value_atime = Number(input_atime.value);
  value_gain  = Number(input_gain.value);
  value_led   = Number(input_led.value);

  // Integration time formula from datasheet 10.2.2
  var integration_time = Math.round(((1+value_atime)*(1+value_astep)*2.78)/1000);
  // Display integration_time*2 because readAllChannels() reads F1-F4, then reads again for F5-F8
  label_sensor_read.textContent = `Time: ${integration_time*2 + 50}ms`;

  label_gain.textContent = `Gain: ${Math.pow(2, value_gain)}X`;

  // Minimum power is 4mA, lower values treated as 0
  if (value_led < 4) {
    value_led = 0;
  }
  label_led.textContent = `Current: ${value_led}mA`;
}

function initiate_read() {
  input_go_button.disabled = true;
  var as7341 = getURLobject();
  as7341.searchParams.set('atime', value_atime);
  as7341.searchParams.set('astep', value_astep);
  as7341.searchParams.set('gain', value_gain);
  as7341.searchParams.set('led_ma', value_led);

  fetch(as7341)
    .then(function (response) { return response.json(); }, report_sensor_error)
    .then(process_sensor_data, report_sensor_error);
}

function display_raw_json(input_object) {
  raw_json.textContent = JSON.stringify(input_object, null, 2);
}

function process_sensor_data(sensor_data) {
  try {
    var spectral_data = spectral_labels.map(x=>sensor_data[x]);

    if (recalculate_normalization_on_next_read) {
      recalculate_normalization_curve(spectral_data);
      recalculate_normalization_on_next_read = false;
    }

    var normalized_data = [];
    spectral_data.forEach((x, index)=>(normalized_data.push(x*normalization_curve[index])));

    var spectral_max = Math.max(...normalized_data);
    normalized_data = normalized_data.map(x=>x/spectral_max);
    spectral_chart.options.plugins.customCanvasBackgroundColor.color = estimate_hue(normalized_data);
    spectral_chart.data.datasets[0].data = normalized_data;
    spectral_chart.options.scales.y.max = 1.2;
    spectral_chart.update();

    var saturation_value = Math.min((value_atime+1)*(value_astep+1), 65535);
    var saturation_detected = false;
    for (var property in sensor_data) {
      var value = Number(sensor_data[property]);
      if (NaN != value && value >= saturation_value) {
        saturation_detected = true;
        break;
      }
    }
    if (saturation_detected) {
      result_status.textContent = "Sensor saturation (overexposure) detected";
    } else {
      result_status.textContent = "Sensor data OK";
    }
    display_raw_json(sensor_data);
  } catch(error) {
    result_status.textContent = "Exception was thrown";
    display_raw_json(JSON.stringify(error));

    // In case of error, stop repeating
    input_repeat_read.checked = false;
  }

  if(input_repeat_read.checked) {
    setTimeout(initiate_read);
  } else {
    // Turn off LED.
    var as7341 = getURLobject();
    as7341.searchParams.set('led_ma', 0);
    fetch(as7341); // Ignore response, we just wanted LED off.

    input_go_button.disabled = false;
  }
}

function report_sensor_error(sensor_error) {
  display_raw_json(sensor_error);
}

//////////////////////////////////////////////////////////////////////////
//
//  Page load setup

document.addEventListener('DOMContentLoaded', contentLoaded, false);
