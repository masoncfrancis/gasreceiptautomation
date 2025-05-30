'use client';

import React, {useState, useEffect} from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import LoadingScreen from '@/components/LoadingScreen';


function GasLogForm() {
    // State to hold form data
    const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null);
    const [odometerPhoto, setOdometerPhoto] = useState<File | null>(null);
    const [odometerReading, setOdometerReading] = useState(''); // State for manual odometer reading
    const [odometerInputMethod, setOdometerInputMethod] = useState('');
    const [filledToFull, setFilledToFull] = useState(''); // 'yes', 'no', or ''
    const [filledLastTime, setFilledLastTime] = useState(''); // 'yes', 'no', or ''
    const [isSubmitting, setIsSubmitting] = useState(false); // State to track submission status
    const [submissionStatus, setSubmissionStatus] = useState<null | 'success' | 'error'>(null);
    // State for validation errors
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Estado seguro para el tema con valor predeterminado
    const [theme, setTheme] = useState<string>('light');

    // Auth0
    const { user, logout, isAuthenticated, isLoading } = useAuth0();

    // Vehicle selection state
    const [vehicles, setVehicles] = useState<{ id: string, name: string }[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<string>('');
    const [vehiclesLoading, setVehiclesLoading] = useState<boolean>(true);
    const [vehiclesError, setVehiclesError] = useState<string | null>(null);


    // Efecto para inicializar el tema desde localStorage (solo en cliente)
    useEffect(() => {
        // Verificar si existe localStorage (solo en el navegador)
        if (typeof window !== 'undefined') {
            const storedTheme = localStorage.getItem('theme');
            if (storedTheme) {
                setTheme(storedTheme);
            } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                setTheme('dark');
            }
        }
    }, []);

    // Effect to apply the 'dark' class to the document element when theme changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const root = window.document.documentElement;
            if (theme === 'dark') {
                root.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                root.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
        }
    }, [theme]); // Re-run effect when theme state changes

    // Function to toggle the theme
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    // Handle file input changes
    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>,
        setFile: React.Dispatch<React.SetStateAction<File | null>>
    ) => {
        if (event.target.files && event.target.files[0]) {
            setFile(event.target.files[0]);
            // Clear validation error when field is filled
            setValidationErrors(prev => {
                const fieldName = event.target.id;
                const newErrors = {...prev};
                delete newErrors[fieldName];
                return newErrors;
            });
        }
    };

    // Handle text input changes
    const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>, setState: {
        (value: React.SetStateAction<string>): void;
        (arg0: any): void;
    }) => {
        setState(event.target.value);
        // Clear validation error when field is filled
        setValidationErrors(prev => {
            const fieldName = event.target.id;
            const newErrors = {...prev};
            delete newErrors[fieldName];
            return newErrors;
        });
    };

    // Handle square button selections (for yes/no and odometer method)
    const handleSquareSelect = (value: string, setState: {
        (value: React.SetStateAction<string>): void;
        (value: React.SetStateAction<string>): void;
    }) => {
        setState(value);
        // Clear related inputs when method changes
        if (setState === setOdometerInputMethod) {
            if (value !== 'separate_photo') setOdometerPhoto(null);
            if (value !== 'manual') setOdometerReading('');

            // Clear validation error when field is filled
            setValidationErrors(prev => {
                const newErrors = {...prev};
                delete newErrors['odometerInputMethod'];
                return newErrors;
            });
        } else if (setState === setFilledToFull) {
            setValidationErrors(prev => {
                const newErrors = {...prev};
                delete newErrors['filledToFull'];
                return newErrors;
            });
        } else if (setState === setFilledLastTime) {
            setValidationErrors(prev => {
                const newErrors = {...prev};
                delete newErrors['filledLastTime'];
                return newErrors;
            });
        }
    };

    // Handle vehicle selection
    const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedVehicle(e.target.value);
        // Optionally clear validation errors for vehicle
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors['selectedVehicle'];
            return newErrors;
        });
    };

    // Fetch vehicles from API on mount
    useEffect(() => {
        const fetchVehicles = async () => {
            setVehiclesLoading(true);
            setVehiclesError(null);
            try {
                const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL;
                const response = await fetch(`${baseUrl}/vehicles`);
                if (!response.ok) throw new Error('Failed to fetch vehicles');
                const data = await response.json();
                if (Array.isArray(data.vehicles)) {
                    setVehicles(
                        data.vehicles.map((v, idx) => ({
                            id: `${v.year}-${v.make}-${v.model}-${idx}`,
                            name: `${v.year} ${v.make} ${v.model}`
                        }))
                    );
                } else {
                    setVehicles([]);
                    setVehiclesError('Invalid data format received from server');
                }
            } catch (err: any) {
                setVehiclesError('Could not load vehicles');
                setVehicles([]);
            } finally {
                setVehiclesLoading(false);
            }
        };
        fetchVehicles();
    }, []);

    // Validate the form
    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        // Vehicle selection validation
        if (!selectedVehicle) {
            errors.selectedVehicle = "Please select a vehicle";
        }

        // Check receipt photo
        if (!receiptPhoto) {
            errors.receiptPhoto = "Receipt photo is required";
        }

        // Check odometer input method
        if (!odometerInputMethod) {
            errors.odometerInputMethod = "Please select how you want to enter the odometer reading";
        } else {
            // Check for required fields based on selected method
            if (odometerInputMethod === 'separate_photo' && !odometerPhoto) {
                errors.odometerPhoto = "Odometer photo is required";
            } else if (odometerInputMethod === 'manual' && !odometerReading) {
                errors.odometerReading = "Odometer reading is required";
            }
        }

        // Check filled to full
        if (!filledToFull) {
            errors.filledToFull = "Please indicate if you filled the car up to full";
        }

        // Check filled last time
        if (!filledLastTime) {
            errors.filledLastTime = "Please indicate if you filled out the form last time you got gas";
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (event: { preventDefault: () => void; }) => {
        event.preventDefault();

        // Validate form before submission
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setSubmissionStatus(null); // Reset status on new submission

        // Create a FormData object to handle file uploads
        const formData = new FormData();
        // Add selected vehicle
        formData.append('vehicleId', selectedVehicle);
        if (receiptPhoto) {
            formData.append('receiptPhoto', receiptPhoto);
        }

        // Append odometer data based on the selected method
        if (odometerInputMethod === 'separate_photo' && odometerPhoto) {
            formData.append('odometerPhoto', odometerPhoto);
        } else if (odometerInputMethod === 'manual' && odometerReading) {
            formData.append('odometerReading', odometerReading);
        }
        formData.append('odometerInputMethod', odometerInputMethod);
        formData.append('filledToFull', filledToFull);
        formData.append('filledLastTime', filledLastTime);

        const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL;
        const apiEndpoint = `${baseUrl}/submitGas`;

        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                console.log('Form submitted successfully!');
                setSubmissionStatus('success');
                setReceiptPhoto(null);
                setOdometerPhoto(null);
                setOdometerReading('');
                setOdometerInputMethod('');
                setFilledToFull('');
                setFilledLastTime('');
                setSelectedVehicle('');
                // Clear validation errors on successful submission
                setValidationErrors({});
            } else {
                console.error('Form submission failed:', response.statusText);
                setSubmissionStatus('error');
                const errorData = await response.json();
                console.error('Error details:', errorData);
            }
        } catch (error) {
            console.error('Error during form submission:', error);
            setSubmissionStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Error display component
    const ErrorMessage = ({ message }: { message: string }) => (
        <p className="text-red-500 text-sm mt-1">{message}</p>
    );

    // Show loading screen while vehicles are loading
    if (vehiclesLoading) {
        return <LoadingScreen />;
    }

    return (
        <div className="container mx-auto p-6 bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 min-h-screen flex items-center justify-center transition-colors duration-300">
            <form
                onSubmit={handleSubmit}
                className="bg-white dark:bg-gray-700 p-10 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-600 transition-colors duration-300"
            >
                {/* Auth0 User Info and Logout */}
                {isAuthenticated && user && (
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-2 justify-end w-full">
                            <span className="px-3 py-1 rounded-lg border-1 font-semibold text-sm transition-colors duration-300">
                                {user.name}
                            </span>
                            <button
                                type="button"
                                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                                className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                )}

                {/* Title Header - Always visible */}
                <h2 className="text-3xl font-extrabold mb-8 text-center text-gray-800 dark:text-white transition-colors duration-300">
                    Gas and Mileage Submission
                </h2>

                {/* Vehicle Selection - Always below title */}
                <div className="mb-7">
                    <label className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-2 transition-colors duration-300">
                        Select your vehicle: <span className="text-red-500">*</span>
                    </label>
                    {vehiclesError ? (
                        <p className="text-red-500">{vehiclesError}</p>
                    ) : (
                        <div className="flex flex-wrap gap-4">
                            {vehicles.map(vehicle => (
                                <button
                                    key={vehicle.id}
                                    type="button"
                                    onClick={() => setSelectedVehicle(vehicle.id)}
                                    className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg border-2 font-semibold text-center transition-colors duration-300
                                        ${selectedVehicle === vehicle.id
                                            ? 'bg-blue-600 text-white border-blue-700 shadow-lg'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500'}
                                        ${validationErrors.selectedVehicle ? 'border-red-500' : ''}
                                    `}
                                    aria-pressed={selectedVehicle === vehicle.id}
                                >
                                    {vehicle.name}
                                </button>
                            ))}
                        </div>
                    )}
                    {validationErrors.selectedVehicle && <ErrorMessage message={validationErrors.selectedVehicle} />}
                </div>

                {/* Hide rest of form until vehicle is selected */}
                {!selectedVehicle ? (
                    <div className="text-center text-gray-600 dark:text-gray-400 mb-4">
                        Please select a vehicle to continue.
                    </div>
                ) : (
                    <>
                        {/* Receipt Photo Input - Estilizado */}
                        <div className="mb-7">
                            <label
                                className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-2 transition-colors duration-300">
                                <span className="inline-block mr-2 align-middle">📸</span> Take a photo of your gas receipt: <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <label htmlFor="receiptPhoto"
                                       className={`flex items-center justify-center w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 font-medium rounded-lg border-2 ${validationErrors.receiptPhoto ? 'border-red-500' : 'border-blue-200 dark:border-gray-700'} cursor-pointer transition-colors duration-300`}>
                                    <span className="mr-2">📸</span> Take/Upload a photo
                                </label>
                                <input
                                    type="file"
                                    id="receiptPhoto"
                                    accept="image/*"
                                    capture={"camera" as "user" | "environment"}
                                    onChange={(e) => handleFileChange(e, setReceiptPhoto)}
                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                    required
                                />
                            </div>
                            {validationErrors.receiptPhoto && <ErrorMessage message={validationErrors.receiptPhoto} />}
                            {receiptPhoto && (
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic transition-colors duration-300">
                                    Selected file: {receiptPhoto.name}
                                </p>
                            )}
                        </div>

                        {/* Odometer Input Method Choice */}
                        <div className="mb-7">
                            <label
                                className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-3 transition-colors duration-300">
                                How would you like to enter the odometer reading? <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-wrap justify-center gap-4">
                                <div
                                    className={`flex-1 min-w-[100px] h-24 border-2 rounded-lg flex flex-col items-center justify-center text-center text-sm font-bold cursor-pointer transition-all duration-300 transform hover:scale-105 p-2
                    ${odometerInputMethod === 'separate_photo' ? 'bg-blue-500 text-white border-blue-600 shadow-lg' : 'border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500'}
                    ${validationErrors.odometerInputMethod ? 'border-red-500' : ''}
                  `}
                                    onClick={() => handleSquareSelect('separate_photo', setOdometerInputMethod)}
                                >
                                    <span className="text-2xl mb-1">📸</span> I'll Take A Photo
                                </div>
                                <div
                                    className={`flex-1 min-w-[100px] h-24 border-2 rounded-lg flex flex-col items-center justify-center text-center text-sm font-bold cursor-pointer transition-all duration-300 transform hover:scale-105 p-2
                     ${odometerInputMethod === 'on_receipt_photo' ? 'bg-blue-500 text-white border-blue-600 shadow-lg' : 'border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500'}
                     ${validationErrors.odometerInputMethod ? 'border-red-500' : ''}
                   `}
                                    onClick={() => handleSquareSelect('on_receipt_photo', setOdometerInputMethod)}
                                >
                                    <span className="text-2xl mb-1">🖊️</span> I Wrote It On The Receipt
                                </div>
                                <div
                                    className={`flex-1 min-w-[100px] h-24 border-2 rounded-lg flex flex-col items-center justify-center text-center text-sm font-bold cursor-pointer transition-all duration-300 transform hover:scale-105 p-2
                     ${odometerInputMethod === 'manual' ? 'bg-blue-500 text-white border-blue-600 shadow-lg' : 'border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500'}
                     ${validationErrors.odometerInputMethod ? 'border-red-500' : ''}
                   `}
                                    onClick={() => handleSquareSelect('manual', setOdometerInputMethod)}
                                >
                                    <span className="text-2xl mb-1">⌨️</span> I'll Type It
                                </div>
                            </div>
                            {validationErrors.odometerInputMethod && <ErrorMessage message={validationErrors.odometerInputMethod} />}
                        </div>

                        {/* Conditionally Render Odometer Input */}
                        {odometerInputMethod === 'separate_photo' && (
                            <div className="mb-7">
                                <label
                                       className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-2 transition-colors duration-300">
                                    <span className="inline-block mr-2 align-middle">📸</span> Take a photo of your odometer: <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <label htmlFor="odometerPhoto"
                                          className={`flex items-center justify-center w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 font-medium rounded-lg border-2 ${validationErrors.odometerPhoto ? 'border-red-500' : 'border-blue-200 dark:border-gray-700'} cursor-pointer transition-colors duration-300`}>
                                        <span className="mr-2">📸</span> Take/Upload a photo
                                    </label>
                                    <input
                                        type="file"
                                        id="odometerPhoto"
                                        accept="image/*"
                                        capture={"camera" as "user" | "environment"}
                                        onChange={(e) => handleFileChange(e, setOdometerPhoto)}
                                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                        required={odometerInputMethod === 'separate_photo'}
                                    />
                                </div>
                                {validationErrors.odometerPhoto && <ErrorMessage message={validationErrors.odometerPhoto} />}
                                {odometerPhoto && (
                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic transition-colors duration-300">
                                        Selected file: {odometerPhoto.name}
                                    </p>
                                )}
                            </div>
                        )}

                        {odometerInputMethod === 'manual' && (
                            <div className="mb-7">
                                <label htmlFor="odometerReading"
                                       className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-2 transition-colors duration-300">
                                    <span className="inline-block mr-2 align-middle">🔢</span> Enter odometer reading: <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    id="odometerReading"
                                    value={odometerReading}
                                    onChange={(e) => handleTextChange(e, setOdometerReading)}
                                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline bg-gray-50 dark:bg-gray-800 ${validationErrors.odometerReading ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} transition-colors duration-300`}
                                    placeholder="e.g., 123456"
                                    required={odometerInputMethod === 'manual'}
                                />
                                {validationErrors.odometerReading && <ErrorMessage message={validationErrors.odometerReading} />}
                            </div>
                        )}

                        {odometerInputMethod === 'on_receipt_photo' && (
                            <div
                                className="mb-7 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg text-blue-800 dark:text-blue-200 text-sm">
                                Okay, we'll look for the odometer reading on the gas receipt photo you provided.
                            </div>
                        )}

                        {/* Filled to Full Question - Using Stylish Square Buttons */}
                        <div className="mb-7">
                            <label
                                className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-3 transition-colors duration-300">
                                Did you fill the car to full? <span className="text-red-500">*</span>
                            </label>
                            <div className="flex space-x-4 justify-center">
                                <div
                                    className={`flex-1 h-24 border-2 rounded-lg flex flex-col items-center justify-center text-lg font-bold cursor-pointer transition-all duration-300 transform hover:scale-105
                    ${filledToFull === 'yes' ? 'bg-green-500 text-white border-green-600 shadow-lg' : 'border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-green-500 dark:hover:border-green-500'}
                    ${validationErrors.filledToFull ? 'border-red-500' : ''}
                  `}
                                    onClick={() => handleSquareSelect('yes', setFilledToFull)}
                                >
                                    <span className="text-3xl mb-1">👍</span> Yes
                                </div>
                                <div
                                    className={`flex-1 h-24 border-2 rounded-lg flex flex-col items-center justify-center text-lg font-bold cursor-pointer transition-all duration-300 transform hover:scale-105
                     ${filledToFull === 'no' ? 'bg-red-500 text-white border-red-600 shadow-lg' : 'border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-red-500 dark:hover:border-red-500'}
                     ${validationErrors.filledToFull ? 'border-red-500' : ''}
                   `}
                                    onClick={() => handleSquareSelect('no', setFilledToFull)}
                                >
                                    <span className="text-3xl mb-1">👎</span> No
                                </div>
                            </div>
                            {validationErrors.filledToFull && <ErrorMessage message={validationErrors.filledToFull} />}
                        </div>

                        {/* Filled Last Time Question */}
                        <div className="mb-7">
                            <label
                                className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-2 transition-colors duration-300">
                                Did you remember to fill this form out last time? <span className="text-red-500">*</span>
                            </label>
                            <p className="mb-3 text-left text-sm text-gray-600 dark:text-gray-400 italic transition-colors duration-300">
                                It's okay if you didn't. Just let us know so we know how to track gas mileage.
                            </p>
                            <div className="flex space-x-4 justify-center">
                                <div
                                    className={`flex-1 h-24 border-2 rounded-lg flex flex-col items-center justify-center text-lg font-bold cursor-pointer transition-all duration-300 transform hover:scale-105
                    ${filledLastTime === 'yes' ? 'bg-green-500 text-white border-green-600 shadow-lg' : 'border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-green-500 dark:hover:border-green-500'}
                    ${validationErrors.filledLastTime ? 'border-red-500' : ''}
                  `}
                                    onClick={() => handleSquareSelect('yes', setFilledLastTime)}
                                >
                                    <span className="text-3xl mb-1">✅</span> Yes
                                </div>
                                <div
                                    className={`flex-1 h-24 border-2 rounded-lg flex flex-col items-center justify-center text-lg font-bold cursor-pointer transition-all duration-300 transform hover:scale-105
                     ${filledLastTime === 'no' ? 'bg-red-500 text-white border-red-600 shadow-lg' : 'border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-red-500 dark:hover:border-red-500'}
                     ${validationErrors.filledLastTime ? 'border-red-500' : ''}
                   `}
                                    onClick={() => handleSquareSelect('no', setFilledLastTime)}
                                >
                                    <span className="text-3xl mb-1">❌</span> No
                                </div>
                            </div>
                            {validationErrors.filledLastTime && <ErrorMessage message={validationErrors.filledLastTime} />}
                        </div>

                        {/* Required fields note */}
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            <span className="text-red-500">*</span> Required fields
                        </div>

                        {/* Submit Button */}
                        <div className="flex items-center justify-center mt-8">
                            <button
                                type="submit"
                                className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105 shadow-lg ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>

                        {/* Submission Status Message */}
                        {submissionStatus === 'success' && (
                            <p className="mt-4 text-center text-green-600 dark:text-green-400 font-semibold transition-colors duration-300">Form
                                submitted successfully!</p>
                        )}
                        {submissionStatus === 'error' && (
                            <p className="mt-4 text-center text-red-600 dark:text-red-400 font-semibold transition-colors duration-300">Error
                                submitting form. Please try again.</p>
                        )}
                    </>
                )}
            </form>
        </div>
    );
}

export default GasLogForm;
