
var input_atime;
var input_astep;
var input_gain;
var input_led;

var value_atime;
var value_astep;
var value_gain;
var value_led;

var output_exposure;
var output_gain;
var output_led;

var raw_json;

function contentLoaded() {
  input_atime = document.getElementById('atime');
  input_atime.addEventListener('input', recalculate_parameters);
  input_astep = document.getElementById('astep');
  input_astep.addEventListener('input', recalculate_parameters);
  input_gain = document.getElementById('gain_power');
  input_gain.addEventListener('input', recalculate_parameters);
  input_led = document.getElementById('led_current');
  input_led.addEventListener('input', recalculate_parameters);

  document.getElementById('go_button').addEventListener('click',initiate_read);

  output_exposure = document.getElementById('calculated_exposure');
  output_gain = document.getElementById('calculated_gain');
  output_led = document.getElementById('calculated_led');

  raw_json = document.getElementById('raw_json');

  recalculate_parameters();
} 

function recalculate_parameters() {
  value_atime = Number(input_atime.value);
  value_astep = Number(input_astep.value);
  value_gain  = Number(input_gain.value);
  value_led   = Number(input_led.value);

  // Integration time formula from datasheet 10.2.2
  var exposure_time = Math.round(((1+value_atime)*(1+value_astep)*2.78)/1000);
  output_exposure.textContent = "Exposure time of ".concat(exposure_time, "ms from atime=").concat(value_atime, " and astep=").concat(value_astep);

  output_gain.textContent = "Sensor gain of ".concat(Math.pow(2, value_gain), "X");

  // Minimum power is 4mA, lower values treated as 0
  if (value_led < 4) {
    value_led = 0;
  }
  output_led.textContent = "LED current of ".concat(value_led, "mA");
}

function initiate_read() {
  var as7341 = new URL('http://esp32-as7341.local/as7341');
  as7341.searchParams.set('atime', value_atime);
  as7341.searchParams.set('astep', value_astep);
  as7341.searchParams.set('gain', value_gain);
  as7341.searchParams.set('led_ma', value_led);

  fetch(as7341)
    .then(function (response) { return response.text(); })
    .then(function (data) { return raw_json.textContent = data; });
}

//////////////////////////////////////////////////////////////////////////
//
//  Page load setup

document.addEventListener('DOMContentLoaded', contentLoaded, false);
