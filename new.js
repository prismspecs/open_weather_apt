var wavData = [];

var numTaps = 50;
var coeffs = getLowPassFIRCoeffs(11025, 1200, numTaps);
var filter = new FIRFilter(coeffs);

var signalMean;
var normalizedData;

var imageCanvas = document.getElementById("output");
var imageCTX = imageCanvas.getContext("2d");

window.onload = function() {

	document.getElementById('spinner').style.visibility = 'hidden';
	document.getElementById('buttons').style.visibility = 'hidden';
	document.getElementById('alert').style.visibility = 'hidden';

	try {
		FileReader = FileReader;
	} catch (e) {
		console.log('Your browser does not support the File API');
	}


	// LOAD THE FILE
	var fileInput = document.getElementById('fileInput');

	fileInput.addEventListener('change', function(e) {
		var file = fileInput.files[0];
		document.getElementById('fileName').value = file.name;

		document.getElementById('spinner').style.visibility = 'visible';
		document.getElementById('buttons').style.visibility = 'hidden';
		document.getElementById('alert').style.visibility = 'hidden';

		wavFile = new wav(file);
		wavFile.onloadend = function() {
			console.log("loaded");

			if (wavFile.sampleRate != 11025) {
				document.getElementById('alert').innerHTML = "File must have a 11025Hz sample rate";
				document.getElementById('alert').style.visibility = 'visible';
				document.getElementById('spinner').style.visibility = 'hidden';
			} else {

				var demod_mode = document.querySelector('input[name="demod_mode"]:checked').value;

				switch(demod_mode) {
					case "abs":
						wavData = demodAbs(wavFile);
						break;

					case "cos":
						wavData = demodCos(wavFile);
						break;
				}

				console.log("rectified");
				console.log(wavData);

				// filter
				var filtered = filterSamples(wavData);
				// console.log(filtered);

				// normalize
				normalizedData = new Float32Array(wavData.length);
				var normalized_mean = normalizeData(filtered);
				normalizedData = normalized_mean[0];
				signalMean = normalized_mean[1];

				console.log(normalizedData);

				chartArray(normalizedData, 10);

			}
		};
	});
}

function demodAbs(input) {
	var data = [];

	for (var i = 0; i < input.dataSamples.length; i++) {
		data[i] = Math.abs(input.dataSamples[i]);
	}

	return data;
}

function demodCos(input) {
	var data = [];

	console.log(" x " + input.dataSamples.length);

	// 2400 is the frequency of the carrier
	var trigArg = Math.PI * 2 * 2400.0 / 11025;
	var cos2 = 2.0 * Math.cos(trigArg);
	var sinArg = Math.sin(trigArg);
	var maxVal = 0.0;
	var minVal = 100;
	for (var c = 1; c < input.dataSamples.length; c++) {
		var temp = Math.sqrt(Math.pow(input.dataSamples[c - 1],2) + Math.pow(input.dataSamples[c],2) - input.dataSamples[c - 1] * input.dataSamples[c] * cos2);
		data[c] = temp / sinArg;
	}

	data[0] = data[1];

	return data;
}


function filterSamples(input) {

	// convert to Float32s

	var f32samples = new Float32Array(input.length);

	for (var i = 0; i < input.length; i++) {
		f32samples[i] = input[i] / 32768;
	}

	filter.loadSamples(f32samples);
	var filteredData = new Float32Array(f32samples.length);

	for (var i = 0; i < f32samples.length; i++) {
		filteredData[i] = filter.get(i);
	}

	console.log("filtered");
	// console.log(filteredData);

	document.getElementById('spinner').style.visibility = 'hidden';
	document.getElementById('buttons').style.visibility = 'visible';

	//uncomment if using the chart
	// chartArray();

	return filteredData;

}


function normalizeData(input) {

	var normalized = [];
	var mean = 0;

	var maxVal = 0;
	var minVal = 1;

	for (var i = 0; i < input.length; i++) {
		if (input[i] > maxVal) {
			maxVal = input[i];
		}
		if (input[i] < minVal) {
			minVal = input[i];
		}
	}
	for (var i = 0; i < input.length; i++) {
		normalized[i] = (input[i] - minVal) / (maxVal - minVal);
		mean += normalized[i]; // COULD BE WRONG
	}

	mean = mean / input.length;

	return [normalized, mean];

}


// simple chart drawing function, resolution simply skips that number
// of entries in the array
function chartArray(input, resolution) {

	var canvas = document.getElementById("myChart");

	var canvasWidth = canvas.width;
	var canvasHeight = canvas.height;

	var scale = canvasHeight;

	var ctx = canvas.getContext("2d");

	ctx.fillStyle = "#697ab2";

	var numSlices = input.length / resolution;

	for (var i = 0; i < input.length; i += resolution) {

		var x = map(i, 0, input.length, 0, numSlices);

		var y = input[i] * scale;

		ctx.fillRect(x, canvasHeight, 1, -y);

	}

}



//starting index comes from convolution, lineCount comes from math
//this kind of comes from https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas
function createImage(startingIndex, pixelScale, pixelStart) {

	lineCount = Math.floor(normalizedData.length / 5513) / pixelScale;
	imageCanvas.height = lineCount;
	var image = imageCTX.createImageData(1040, lineCount);

	var lineStartIndex = startingIndex;
	console.log(lineCount + " possible lines");

	var downSampler = new Downsampler(11025, 4160, coeffs);
	var thisLineData;

	//each line
	for (var line = 0; line < lineCount; line++) {
		//each column, currently only Channel A

		thisLineData = downSampler.downsample(normalizedData.slice(lineStartIndex + 20, lineStartIndex + 5533));

		for (var column = 0; column < 1040; column++) {
			var value = thisLineData[pixelStart + column * pixelScale] * 255;
			//R=G=B for grayscale
			image.data[line * 1040 * 4 + column * 4] = value;
			image.data[line * 1040 * 4 + column * 4 + 1] = value;
			image.data[line * 1040 * 4 + column * 4 + 2] = value;
			//alpha = 255
			image.data[line * 1040 * 4 + column * 4 + 3] = 255;
		}
		//updating lineStartIndex to equal the start of the next
		//line helps straighten the image
		var conv = convolveWithSync(lineStartIndex + (5512 * pixelScale) - 20, 40);
		//If the convolution actually found something, use that
		if (conv.score > 6) {
			lineStartIndex = conv.index;
		} else { //otherwise, just guess the next line
			lineStartIndex += 5512 * pixelScale;
		}
	}
	imageCTX.putImageData(image, 0, 0);
}


function convolveWithSync(start, range) {
	var sync = [-1, -1, -1, -1, -1, -1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, 1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, 1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, 1, 1, 1, 1, 1];
	var maxVal = 0;
	var maxIndex = 0;
	for (var i = start; i < start + range; i++) {
		sum = 0;
		for (var c = 0; c < sync.length; c++) {
			sum += (normalizedData[i + c] - signalMean) * sync[c];
		}
		if (sum > maxVal) {
			maxVal = sum;
			maxIndex = i;
		}
	}
	return {
		"index": maxIndex,
		"score": maxVal
	};
}



function viewA() {
	var pixelScale = 1;
	var pixelStart = 0;
	createImage(convolveWithSync(0, 22050).index, pixelScale, pixelStart);
}

function viewB() {
	var pixelScale = 1;
	var pixelStart = 1040;
	createImage(convolveWithSync(0, 22050).index, pixelScale, pixelStart);
}

function viewAB() {
	var pixelScale = 2;
	var pixelStart = 0;
	createImage(convolveWithSync(0, 22050).index, pixelScale, pixelStart);
}


function map(inputNum, inputMin, inputMax, outputMin, outputMax) {
	return outputMin + (inputNum - inputMin) * (outputMax - outputMin) / (inputMax - inputMin);
}
