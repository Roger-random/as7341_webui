var input_atime;
var input_astep;
var input_gain;
var input_led;

var value_atime;
const value_astep = 3596; // (3596+1)*2.78us = 9.99966ms close enough to 10ms
var value_gain;
var value_led;

var label_exposure;
var label_gain;
var label_led;

var raw_json;

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

  document.getElementById('go_button').addEventListener('click',initiate_read);

  label_exposure = document.getElementById('label_exposure');
  label_gain = document.getElementById('label_gain');
  label_led = document.getElementById('label_led');

  raw_json = document.getElementById('raw_json');

  recalculate_parameters();
}

function recalculate_parameters() {
  value_atime = Number(input_atime.value);
  value_gain  = Number(input_gain.value);
  value_led   = Number(input_led.value);

  // Integration time formula from datasheet 10.2.2
  var exposure_time = Math.round(((1+value_atime)*(1+value_astep)*2.78)/1000);
  label_exposure.textContent = "Exposure time: ".concat(exposure_time, "ms");

  label_gain.textContent = "Sensor gain: ".concat(Math.pow(2, value_gain), "X");

  // Minimum power is 4mA, lower values treated as 0
  if (value_led < 4) {
    value_led = 0;
  }
  label_led.textContent = "LED current: ".concat(value_led, "mA");
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
