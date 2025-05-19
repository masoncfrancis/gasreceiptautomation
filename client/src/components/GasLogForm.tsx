import React, { useState, useEffect } from 'react';

// Assume Tailwind CSS is set up in your project with dark mode enabled (e.g., darkMode: 'class' in tailwind.config.js)

function GasLogForm() {
    // State to hold form data
    const [receiptPhoto, setReceiptPhoto] = useState(null);
    const [odometerPhoto, setOdometerPhoto] = useState(null);
    const [odometerReading, setOdometerReading] = useState(''); // State for manual odometer reading
    // State for odometer input method: 'separate_photo', 'on_receipt_photo', 'manual', or ''
    const [odometerInputMethod, setOdometerInputMethod] = useState('');
    const [filledToFull, setFilledToFull] = useState(''); // 'yes', 'no', or ''
    const [filledLastTime, setFilledLastTime] = useState(''); // 'yes', 'no', or ''
    const [isSubmitting, setIsSubmitting] = useState(false); // State to track submission status
    const [submissionStatus, setSubmissionStatus] = useState(null); // 'success', 'error', or null

    // State for theme mode, initialized from local storage or system preference
    const [theme, setTheme] = useState(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            return storedTheme;
        }
        // Check system preference if no theme is stored
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    // Effect to apply the 'dark' class to the document element when theme changes
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [theme]); // Re-run effect when theme state changes

    // Function to toggle the theme
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    // Handle file input changes
    const handleFileChange = (event, setFile) => {
        if (event.target.files && event.target.files[0]) {
            setFile(event.target.files[0]);
        }
    };

    // Handle text input changes
    const handleTextChange = (event, setState) => {
        setState(event.target.value);
    };

    // Handle square button selections (for yes/no and odometer method)
    const handleSquareSelect = (value, setState) => {
        setState(value);
        // Clear related inputs when method changes
        if (setState === setOdometerInputMethod) {
            if (value !== 'separate_photo') setOdometerPhoto(null);
            if (value !== 'manual') setOdometerReading('');
        }
    };

    // Handle form submission
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setSubmissionStatus(null); // Reset status on new submission

        // Create a FormData object to handle file uploads
        const formData = new FormData();
        if (receiptPhoto) {
            formData.append('receiptPhoto', receiptPhoto);
        }

        // Append odometer data based on the selected method
        if (odometerInputMethod === 'separate_photo' && odometerPhoto) {
            formData.append('odometerPhoto', odometerPhoto);
        } else if (odometerInputMethod === 'manual' && odometerReading) {
            formData.append('odometerReading', odometerReading);
        }
        // If odometerInputMethod is 'on_receipt_photo', we assume the backend will extract
        // the reading from the receiptPhoto, so we don't append a separate odometer field here.
        formData.append('odometerInputMethod', odometerInputMethod); // Send the selected method

        formData.append('filledToFull', filledToFull);
        formData.append('filledLastTime', filledLastTime);

        // Replace 'YOUR_BACKEND_API_ENDPOINT' with your actual endpoint URL
        const apiEndpoint = 'YOUR_BACKEND_API_ENDPOINT';

        try {
            // Simulate network request delay for demo purposes
            // await new Promise(resolve => setTimeout(resolve, 1500));

            const response = await fetch(apiEndpoint, {
                method: 'POST', // Or 'PUT', depending on your API
                body: formData, // Use formData for file uploads
                // If not sending files, you might use JSON:
                // headers: {
                //   'Content-Type': 'application/json',
                // },
                // body: JSON.stringify({
                //   filledToFull,
                //   filledLastTime,
                //   // Note: Sending files as base64 in JSON is generally inefficient.
                //   // FormData is preferred for file uploads.
                // }),
            });

            if (response.ok) {
                // Handle successful submission
                console.log('Form submitted successfully!');
                setSubmissionStatus('success');
                // You might want to clear the form here
                // setReceiptPhoto(null);
                // setOdometerPhoto(null);
                // setOdometerReading('');
                // setOdometerInputMethod('');
                // setFilledToFull('');
                // setFilledLastTime('');
            } else {
                // Handle errors
                console.error('Form submission failed:', response.statusText);
                setSubmissionStatus('error');
                // Optionally read response body for more details:
                // const errorData = await response.json();
                // console.error('Error details:', errorData);
            }
        } catch (error) {
            console.error('Error during form submission:', error);
            setSubmissionStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        // Apply dark mode classes conditionally to the root container
        <div className="container mx-auto p-6 bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 min-h-screen flex items-center justify-center transition-colors duration-300">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-700 p-10 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-600 transition-colors duration-300">
                {/* Theme Toggle Button */}
                <div className="flex justify-end mb-4">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="p-2 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
                        aria-label="Toggle theme"
                    >
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                </div>

                <h2 className="text-3xl font-extrabold mb-8 text-center text-gray-800 dark:text-white transition-colors duration-300">Fuel & Odometer Log</h2>

                {/* Receipt Photo Input */}
                <div className="mb-7">
                    <label htmlFor="receiptPhoto" className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-2 transition-colors duration-300">
                        <span className="inline-block mr-2 align-middle">📸</span> Take a photo of your gas receipt:
                    </label>
                    <input
                        type="file"
                        id="receiptPhoto"
                        accept="image/*"
                        capture="camera" // Suggests using camera on mobile
                        onChange={(e) => handleFileChange(e, setReceiptPhoto)}
                        className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 dark:file:bg-blue-600 dark:hover:file:bg-blue-700 transition-colors duration-300"
                    />
                    {receiptPhoto && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic transition-colors duration-300">Selected file: {receiptPhoto.name}</p>
                    )}
                </div>

                {/* Odometer Input Method Choice */}
                <div className="mb-7">
                    <label className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-3 transition-colors duration-300">
                        How would you like to enter the odometer reading?
                    </label>
                    <div className="flex flex-wrap justify-center gap-4"> {/* Use flex-wrap and gap for better layout on small screens */}
                        {/* Separate Photo Button */}
                        <div
                            className={`flex-1 min-w-[100px] h-24 border-2 rounded-lg flex flex-col items-center justify-center text-center text-sm font-bold cursor-pointer transition-all duration-300 transform hover:scale-105 p-2
                ${odometerInputMethod === 'separate_photo' ? 'bg-blue-500 text-white border-blue-600 shadow-lg' : 'border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500'}
              `}
                            onClick={() => handleSquareSelect('separate_photo', setOdometerInputMethod)}
                        >
                            <span className="text-2xl mb-1">🚗</span> Separate Photo
                        </div>
                        {/* On Receipt Photo Button */}
                        <div
                            className={`flex-1 min-w-[100px] h-24 border-2 rounded-lg flex flex-col items-center justify-center text-center text-sm font-bold cursor-pointer transition-all duration-300 transform hover:scale-105 p-2
                 ${odometerInputMethod === 'on_receipt_photo' ? 'bg-blue-500 text-white border-blue-600 shadow-lg' : 'border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500'}
               `}
                            onClick={() => handleSquareSelect('on_receipt_photo', setOdometerInputMethod)}
                        >
                            <span className="text-2xl mb-1">🧾</span> On Receipt Photo
                        </div>
                        {/* Manual Button */}
                        <div
                            className={`flex-1 min-w-[100px] h-24 border-2 rounded-lg flex flex-col items-center justify-center text-center text-sm font-bold cursor-pointer transition-all duration-300 transform hover:scale-105 p-2
                 ${odometerInputMethod === 'manual' ? 'bg-blue-500 text-white border-blue-600 shadow-lg' : 'border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500'}
               `}
                            onClick={() => handleSquareSelect('manual', setOdometerInputMethod)}
                        >
                            <span className="text-2xl mb-1">⌨️</span> Manual
                        </div>
                    </div>
                </div>

                {/* Conditionally Render Odometer Input */}
                {odometerInputMethod === 'separate_photo' && (
                    <div className="mb-7">
                        <label htmlFor="odometerPhoto" className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-2 transition-colors duration-300">
                            <span className="inline-block mr-2 align-middle">📸</span> Take a photo of your odometer:
                        </label>
                        <input
                            type="file"
                            id="odometerPhoto"
                            accept="image/*"
                            capture="camera" // Suggests using camera on mobile
                            onChange={(e) => handleFileChange(e, setOdometerPhoto)}
                            className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 dark:file:bg-blue-600 dark:hover:file:bg-blue-700 transition-colors duration-300"
                        />
                        {odometerPhoto && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic transition-colors duration-300">Selected file: {odometerPhoto.name}</p>
                        )}
                    </div>
                )}

                {odometerInputMethod === 'manual' && (
                    <div className="mb-7">
                        <label htmlFor="odometerReading" className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-2 transition-colors duration-300">
                            <span className="inline-block mr-2 align-middle">🔢</span> Enter odometer reading:
                        </label>
                        <input
                            type="number" // Use type="number" for numerical input
                            id="odometerReading"
                            value={odometerReading}
                            onChange={(e) => handleTextChange(e, setOdometerReading)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 transition-colors duration-300"
                            placeholder="e.g., 123456"
                        />
                    </div>
                )}

                {odometerInputMethod === 'on_receipt_photo' && (
                    <div className="mb-7 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg text-blue-800 dark:text-blue-200 text-sm">
                        Okay, we'll look for the odometer reading on the gas receipt photo you provided.
                    </div>
                )}


                {/* Filled to Full Question - Using Stylish Square Buttons */}
                <div className="mb-7">
                    <label className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-3 transition-colors duration-300">
                        Did you fill the car to full?
                    </label>
                    <div className="flex space-x-4 justify-center"> {/* Use flex and space-x for layout */}
                        {/* Yes Button */}
                        <div
                            className={`flex-1 h-24 border-2 rounded-lg flex flex-col items-center justify-center text-lg font-bold cursor-pointer transition-all duration-300 transform hover:scale-105
                ${filledToFull === 'yes' ? 'bg-green-500 text-white border-green-600 shadow-lg' : 'border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-green-500 dark:hover:border-green-500'}
              `}
                            onClick={() => handleSquareSelect('yes', setFilledToFull)}
                        >
                            <span className="text-3xl mb-1">👍</span> Yes
                        </div>
                        {/* No Button */}
                        <div
                            className={`flex-1 h-24 border-2 rounded-lg flex flex-col items-center justify-center text-lg font-bold cursor-pointer transition-all duration-300 transform hover:scale-105
                 ${filledToFull === 'no' ? 'bg-red-500 text-white border-red-600 shadow-lg' : 'border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-red-500 dark:hover:border-red-500'}
               `}
                            onClick={() => handleSquareSelect('no', setFilledToFull)}
                        >
                            <span className="text-3xl mb-1">👎</span> No
                        </div>
                    </div>
                </div>

                {/* Filled Last Time Question - Using Stylish Square Buttons */}
                <div className="mb-7">
                    <label className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-2 transition-colors duration-300">
                        Did you remember to fill this form out last time?
                    </label>
                    {/* Note about filling out last time */}
                    <p className="mb-3 text-left text-sm text-gray-600 dark:text-gray-400 italic transition-colors duration-300">
                        It's okay if you didn't. Just let us know so we know how to track gas mileage.
                    </p>
                    <div className="flex space-x-4 justify-center"> {/* Use flex and space-x for layout */}
                        {/* Yes Button */}
                        <div
                            className={`flex-1 h-24 border-2 rounded-lg flex flex-col items-center justify-center text-lg font-bold cursor-pointer transition-all duration-300 transform hover:scale-105
                ${filledLastTime === 'yes' ? 'bg-green-500 text-white border-green-600 shadow-lg' : 'border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-green-500 dark:hover:border-green-500'}
              `}
                            onClick={() => handleSquareSelect('yes', setFilledLastTime)}
                        >
                            <span className="text-3xl mb-1">✅</span> Yes
                        </div>
                        {/* No Button */}
                        <div
                            className={`flex-1 h-24 border-2 rounded-lg flex flex-col items-center justify-center text-lg font-bold cursor-pointer transition-all duration-300 transform hover:scale-105
                 ${filledLastTime === 'no' ? 'bg-red-500 text-white border-red-600 shadow-lg' : 'border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-red-500 dark:hover:border-red-500'}
               `}
                            onClick={() => handleSquareSelect('no', setFilledLastTime)}
                        >
                            <span className="text-3xl mb-1">❌</span> No
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-center mt-8">
                    <button
                        type="submit"
                        className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105 shadow-lg ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Log'}
                    </button>
                </div>

                {/* Submission Status Message */}
                {submissionStatus === 'success' && (
                    <p className="mt-4 text-center text-green-600 dark:text-green-400 font-semibold transition-colors duration-300">Form submitted successfully!</p>
                )}
                {submissionStatus === 'error' && (
                    <p className="mt-4 text-center text-red-600 dark:text-red-400 font-semibold transition-colors duration-300">Error submitting form. Please try again.</p>
                )}
            </form>
        </div>
    );
}

export default GasLogForm;
