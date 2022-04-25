var wavData = [];

var numTaps = 50;
var coeffs = getLowPassFIRCoeffs(11025, 1200, numTaps);
// console.log(coeffs);
var filter = new FIRFilter(coeffs);

var signalMean;
var normalizedData;

var imageCanvas = document.getElementById("output");
var imageCTX = imageCanvas.getContext("2d");

window.onload = function() {

	document.getElementById('spinner').style.visibility = 'hidden';
	document.getElementById('alert').style.visibility = 'hidden';

	try {
		FileReader = FileReader;
	} catch (e) {
		console.log('Your browser does not support the File API');
	}


	// LOAD THE FILE
	var fileInput = document.getElementById('fileInput');

	fileInput.addEventListener('change', function(e) {
		file = fileInput.files[0];
	});
}

function start() {

	try {

		document.getElementById('fileName').value = file.name;

	} catch (error) {

		$(".error_outer").fadeIn();
		$(".error_inner .text").html("Please first select a file");

		return;

	}

	document.getElementById('spinner').style.visibility = 'visible';
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

			switch (demod_mode) {
				case "abs":
					wavData = demodAbs(wavFile);
					break;

				case "cos":
					wavData = demodCos(wavFile);
					break;

				case "hilbertfft":

					break;
			}


			// coeffs = getLowPassFIRCoeffs(11025, 1200, numTaps);



			// console.log("rectified");
			// console.log(wavData);

			// filter
			var filtered = filterSamples(wavData);
			// console.log(filtered);

			// normalize
			normalizedData = new Float32Array(wavData.length);
			var normalized_mean = normalizeData(filtered);
			normalizedData = normalized_mean[0];
			signalMean = normalized_mean[1];

			// console.log(normalizedData);


			// chartArray(normalizedData, 10);

		}
	};
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
		var temp = Math.sqrt(Math.pow(input.dataSamples[c - 1], 2) + Math.pow(input.dataSamples[c], 2) - input.dataSamples[c - 1] * input.dataSamples[c] * cos2);
		data[c] = temp / sinArg;
	}

	data[0] = data[1];

	return data;
}


function demodHilbert(input) {
	var data = [];

	for (var i = 0; i < input.dataSamples.length; i++) {
		data[i] = Math.abs(input.dataSamples[i]);
	}

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

	$(".view_buttons").show();
	$("#spinner").hide();

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

	// reveal controls for saving image etc
	$(".image_buttons").show();

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

function histogramEqualization() {
	let imgElement = document.getElementById("output");
	let src = cv.imread(imgElement);
	let dst = new cv.Mat();
	let hsvPlanes = new cv.MatVector();
	let mergedPlanes = new cv.MatVector();
	cv.cvtColor(src, src, cv.COLOR_RGB2HSV, 0);
	cv.split(src, hsvPlanes);
	let H = hsvPlanes.get(0);
	let S = hsvPlanes.get(1);
	let V = hsvPlanes.get(2);
	cv.equalizeHist(V, V);
	mergedPlanes.push_back(H);
	mergedPlanes.push_back(S);
	mergedPlanes.push_back(V);
	cv.merge(mergedPlanes, src);
	cv.cvtColor(src, dst, cv.COLOR_HSV2RGB, 0);
	cv.imshow("equalized", dst);
	src.delete();
	dst.delete();
	hsvPlanes.delete();
	mergedPlanes.delete();

	$(".histo_buttons").show();
}









function hildemod(data, size) {
	// the data is real
	// size must be a power of two the following test that.
	// a binary number that is a power of two only has one bit on
	// an integer x and x -1 has one less bit on than x
	// therefore if x is a power of 2, x and x-1 has no bits on and is equal to z
	if (((size & (size - 1)) != 0) || (size <= 0)) {
		console.log(" size for Hilbert is not a power of two. Size is " + size);
	}

	var dataLen = data.length;

	var dataDemod = new Float32Array(dataLen);

	var thisSet;
	var thisSetDM;
	var demod = new Float32Array(dataLen);

	if (size >= dataLen) {
		console.log(" size for Hilbert FFT is greater that then size of the data file");
		console.log(" Hilbert FFT size is " + size);
		console.log(" Data files size is " + dataLen);
	}

	var num_hils = dataLen / size;
	for (var ii = 0; ii < num_hils; ii++) {
		var ptr = ii * size;

		thisSet = data.slic(ptr, ptr + size);
		// thisSet = subset(data, ptr, size);

		var hil = hilbert(thisSet);
		//println("hil");
		thisSetDM = abs_cpx(hil);

		for (var jj = 0; jj < size; jj++) {
			demod[jj + ptr] = thisSetDM[jj];
		}
	}

	return demod;

}


function hilbert(data) {
	var num = data.length;
	fft = new FFT(num, 10);

	// compute the FFT of the real array xr
	fft.forward(data);

	var fftr = new Float32Array(num);

	fftr = fft.getSpectrumReal();

	var ffti = new Float32Array(num);
	ffti = fft.getSpectrumImaginary();


	//println("fft before mult ");
	//print_cvec(fftr, ffti, 20);
	//println("end fft before mult");
	// remove negative components
	var lower = 1 + num / 2;
	var upper = num;

	for (var ii = lower; ii < upper; ii++) {
		fftr[ii] = 0;
		ffti[ii] = 0;
	}
	for (var ii = 1; ii < num / 2; ii++) {
		fftr[ii] = 2 * fftr[ii];
		ffti[ii] = 2 * ffti[ii];
	}
	//println("fft after mult");
	//for (int ii = 0; ii < 20; ii++) {
	//  println(fftr[ii], "  ", ffti[ii]);
	//}
	//print("end fft after mult");

	var hil = ifft_cpx(fftr, ffti);

	//println("hil");
	//for (int ii = 0; ii < m; ii++) {
	//  println(hil[ii][0], "  ", hil[ii][1]);
	//}

	return hil;
}



/** computes inverse fft give comples inputs

  */
function ifft_cpx(xr, xi) {

	var num = xr.length;

	var Xc = fft_cpx(xr, xi);

	for (var ii = 0; ii < num; ii++) {
		Xc[ii][0] = Xc[ii][0] / num;
		Xc[ii][1] = Xc[ii][1] / num;
	}

	var xres;
	xres[0][0] = Xc[0][0];
	xres[0][1] = Xc[0][1];

	for (var ii = num - 1; ii > 0; ii--) {
		xres[num - ii][0] = Xc[ii][0];
		xres[num - ii][1] = Xc[ii][1];
	}

	return xres;

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
