# Open Weather APT

----------

A browser-based APT decoder for NOAA satellites based on [ThatcherC's github repo](https://github.com/ThatcherC/APT3000), modified to meet the needs of Open Weather. Contributions from ...

## To-do

+ Uploading resampled WAV files and displaying them in A, B and A/B formats, like APT 3000
+ Choosing the demodulation method from

    1. absolute value
    2. cosine
    3. fourier / hilbert transform

+ On the processed image, adding histogram equalisation if desired
+ Choosing where the programme searches for the sync (after what number of seconds or samples)
+ Saving processed images
+ Adding some text by the Open Weather team about what the steps mean and what is happening in the decoding process (so people understand why it matters to change the demod method, why the sync can be searched for in different places, etc).
+ Automatic resampling (from 44100)
+ Allow user to specify the time at which the program starts looking for the sync signal (to cut off the heavy noise in the beginning of transmission)

## Works Cited

*(helpful pages from around the web thanks to ThatcherC)*:
- http://www.ncdc.noaa.gov/oa/pod-guide/ncdc/docs/klm/html/c4/sec4-2.htm
- http://markroland.com/project/weather-satellite-imaging/APT_decode.m
- https://github.com/ffdead/wav.js/blob/master/wav.js
- https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas
