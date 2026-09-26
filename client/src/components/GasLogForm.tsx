import React, { useState, useEffect, useRef } from "react";
import * as Sentry from "@sentry/react";
import { useAuth } from "react-oidc-context";
import LoadingScreen from "./LoadingScreen";

type ReviewData = {
  totalCost: number | string;
  gallonsPurchased: number | string;
  datetime: string;
  storeBrand: string;
  storeAddress: string;
  odometerReading: number | string;
};

function GasLogForm() {
  // State to hold form data
  const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null);
  const [odometerPhoto, setOdometerPhoto] = useState<File | null>(null);
  const [odometerReading, setOdometerReading] = useState(""); // State for manual odometer reading
  const [odometerInputMethod, setOdometerInputMethod] = useState("");
  const [filledToFull, setFilledToFull] = useState(""); // 'yes', 'no', or ''
  const [filledLastTime, setFilledLastTime] = useState(""); // 'yes', 'no', or ''
  const [isSubmitting, setIsSubmitting] = useState(false); // State to track submission status
  const [submissionStatus, setSubmissionStatus] = useState<
    null | "success" | "error"
  >(null);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [activeReviewField, setActiveReviewField] = useState<keyof ReviewData | null>(null);
  const reviewInputRef = useRef<HTMLInputElement>(null);
  // State for validation errors
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const [theme, setTheme] = useState<string>("light");

  // OIDC
  const { user, isAuthenticated, signinSilent, signoutRedirect } = useAuth();

  const getValidAccessToken = async (): Promise<string> => {
    if (user && user.access_token && !user.expired) {
      return user.access_token;
    }
    const freshUser = await signinSilent();
    if (freshUser?.access_token) {
      return freshUser.access_token;
    }
    throw new Error("Not authenticated");
  };

  const fetchWithAuth = async (input: RequestInfo, init: RequestInit = {}) => {
    const requestMethod =
      init.method || (input instanceof Request ? input.method : "GET");
    const method = requestMethod.toUpperCase();
    let pathname = "unknown";
    try {
      pathname = new URL(
        input instanceof Request ? input.url : input,
        window.location.href,
      ).pathname;
    } catch {
      // Keep error reporting from interfering with the request path.
    }

    try {
      const token = await getValidAccessToken();
      const headers = new Headers(init.headers || {});
      headers.set("Authorization", `Bearer ${token}`);
      const response = await fetch(input, { ...init, headers });

      if (!response.ok) {
        Sentry.withScope((scope) => {
          scope.setTag("http.status_code", response.status);
          scope.setTag("http.method", method);
          scope.setContext("request", { path: pathname });
          Sentry.captureMessage(
            `HTTP request failed with status ${response.status}`,
            "error",
          );
        });
      }

      return response;
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag("http.method", method);
        scope.setContext("request", { path: pathname });
        Sentry.captureException(error);
      });
      throw error;
    }
  };

  // Vehicle selection state
  const [vehicles, setVehicles] = useState<
    { id: string; vehicleId: number; name: string }[]
  >([]);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [vehiclesLoading, setVehiclesLoading] = useState<boolean>(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);

  // Initialize theme from localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setTheme(storedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  // Apply the 'dark' class to the document element when theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [theme]);

  useEffect(() => {
    if (activeReviewField) {
      reviewInputRef.current?.focus();
    }
  }, [activeReviewField]);

  // Handle file input changes
  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
  ) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setValidationErrors((prev) => {
        const fieldName = event.target.id;
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Handle text input changes
  const handleTextChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setState: (value: React.SetStateAction<string>) => void,
  ) => {
    setState(event.target.value);
    setValidationErrors((prev) => {
      const fieldName = event.target.id;
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  // Handle square button selections (for yes/no and odometer method)
  const handleSquareSelect = (
    value: string,
    setState: {
      (value: React.SetStateAction<string>): void;
      (value: React.SetStateAction<string>): void;
    },
  ) => {
    setState(value);
    if (setState === setOdometerInputMethod) {
      if (value !== "separate_photo") setOdometerPhoto(null);
      if (value !== "manual") setOdometerReading("");
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors["odometerInputMethod"];
        return newErrors;
      });
    } else if (setState === setFilledToFull) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors["filledToFull"];
        return newErrors;
      });
    } else if (setState === setFilledLastTime) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors["filledLastTime"];
        return newErrors;
      });
    }
  };

  // Handle vehicle selection
  const handleVehicleButtonClick = (vehicleId: number) => {
    setSelectedVehicle(vehicleId);
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors["selectedVehicle"];
      return newErrors;
    });
  };

  // Fetch vehicles from API on mount
  useEffect(() => {
    const fetchVehicles = async () => {
      setVehiclesLoading(true);
      setVehiclesError(null);
      try {
        const response = await fetchWithAuth(`/api/vehicles`);
        if (!response.ok) throw new Error("Failed to fetch vehicles");
        const data = await response.json();
        if (Array.isArray(data.vehicles)) {
          setVehicles(
            data.vehicles.map(
              (
                v: {
                  year: number;
                  make: string;
                  model: string;
                  vehicleId: number;
                },
                idx: number,
              ) => ({
                id: `${v.year}-${v.make}-${v.model}-${idx}`,
                vehicleId: v.vehicleId,
                name: `${v.year} ${v.make} ${v.model}`,
              }),
            ),
          );
        } else {
          setVehicles([]);
          setVehiclesError("Invalid data format received from server");
        }
      } catch {
        setVehiclesError("Could not load vehicles");
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

    if (selectedVehicle === null) {
      errors.selectedVehicle = "Please select a vehicle";
    }

    if (!receiptPhoto) {
      errors.receiptPhoto = "Receipt photo is required";
    }

    if (!odometerInputMethod) {
      errors.odometerInputMethod =
        "Please select how you want to enter the odometer reading";
    } else {
      if (odometerInputMethod === "separate_photo" && !odometerPhoto) {
        errors.odometerPhoto = "Odometer photo is required";
      } else if (odometerInputMethod === "manual" && !odometerReading) {
        errors.odometerReading = "Odometer reading is required";
      }
    }

    if (!filledToFull) {
      errors.filledToFull = "Please indicate if you filled the car up to full";
    }

    if (!filledLastTime) {
      errors.filledLastTime =
        "Please indicate if you filled out the form last time you got gas";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();

    if (reviewData) {
      const totalCost = Number(reviewData.totalCost);
      const gallonsPurchased = Number(reviewData.gallonsPurchased);
      const odometer = Number(reviewData.odometerReading);
      if (
        !reviewData.datetime.trim() ||
        !reviewData.storeBrand.trim() ||
        !reviewData.storeAddress.trim() ||
        !Number.isFinite(totalCost) ||
        totalCost <= 0 ||
        !Number.isFinite(gallonsPurchased) ||
        gallonsPurchased <= 0 ||
        !Number.isInteger(odometer) ||
        odometer < 0
      ) {
        setSubmissionStatus("error");
        return;
      }
    } else if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionStatus(null);

    const formData = new FormData();
    formData.append("receiptPhoto", receiptPhoto!);
    if (odometerInputMethod === "separate_photo" && odometerPhoto) {
      formData.append("odometerPhoto", odometerPhoto);
    }
    formData.append("odometerInputMethod", odometerInputMethod);
    if (odometerInputMethod === "manual") {
      formData.append("odometerReading", odometerReading);
    }

    try {
      if (!reviewData) {
        const previewResponse = await fetchWithAuth(`/api/previewGas`, {
          method: "POST",
          body: formData,
        });
        if (!previewResponse.ok)
          throw new Error("Could not extract receipt data");
        const preview = await previewResponse.json();
        const extracted = preview.receiptData;
        const extractedMissingFields: string[] = extracted.missingFields ?? [];
        setReviewData({
          totalCost: extracted.totalCost ?? "",
          gallonsPurchased: extracted.gallonsPurchased ?? "",
          datetime: extracted.datetime ?? "",
          storeBrand: extracted.storeBrand ?? "",
          storeAddress: extracted.storeAddress ?? "",
          odometerReading: extracted.odometerReading ?? "",
        });
        setMissingFields(extractedMissingFields);
        setActiveReviewField(
          (extractedMissingFields[0] as keyof ReviewData | undefined) ?? null,
        );
        return;
      }

      formData.append("vehicleId", String(selectedVehicle));
      formData.append("filledToFull", filledToFull);
      formData.append("filledLastTime", filledLastTime);
      formData.append("userName", user?.profile?.name || "");
      formData.append("confirmedTotalCost", String(reviewData.totalCost));
      formData.append(
        "confirmedGallonsPurchased",
        String(reviewData.gallonsPurchased),
      );
      formData.append("confirmedDatetime", reviewData.datetime);
      formData.append("confirmedStoreBrand", reviewData.storeBrand);
      formData.append("confirmedStoreAddress", reviewData.storeAddress);
      formData.append(
        "confirmedOdometerReading",
        String(reviewData.odometerReading),
      );

      const response = await fetchWithAuth(`/api/submitGas`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        console.log("Form submitted successfully!");
        setSubmissionStatus("success");
        setReceiptPhoto(null);
        setOdometerPhoto(null);
        setOdometerReading("");
        setOdometerInputMethod("");
        setFilledToFull("");
        setFilledLastTime("");
        setSelectedVehicle(null);
        setReviewData(null);
        setMissingFields([]);
        setActiveReviewField(null);
        setValidationErrors({});
      } else {
        console.error("Form submission failed:", response.statusText);
        setSubmissionStatus("error");
        const errorData = await response.json();
        console.error("Error details:", errorData);
      }
    } catch (error) {
      console.error("Error during form submission:", error);
      setSubmissionStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Error display component
  const ErrorMessage = ({ message }: { message: string }) => (
    <p className="text-red-500 text-sm mt-1">{message}</p>
  );

  if (vehiclesLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container mx-auto p-6 bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 min-h-screen flex items-center justify-center transition-colors duration-300">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-700 p-10 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-600 transition-colors duration-300"
      >
        {/* User Info and Logout */}
        {isAuthenticated && user && (
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2 justify-end w-full">
              <span className="px-3 py-1 rounded-lg border-1 font-semibold text-sm transition-colors duration-300">
                {user.profile?.name}
              </span>
              <button
                type="button"
                onClick={() =>
                  signoutRedirect({
                    extraQueryParams: { returnTo: window.location.origin },
                  })
                }
                className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* Title Header */}
        <h2 className="text-3xl font-extrabold mb-8 text-center text-gray-800 dark:text-white transition-colors duration-300">
          Gas and Mileage Submission
        </h2>

        {/* Global messages */}
        {(submissionStatus === "success" || vehiclesError) && (
          <div className="w-full max-w-lg mb-6 mx-auto">
            {submissionStatus === "success" && (
              <p className="text-center text-green-600 dark:text-green-400 font-semibold transition-colors duration-300 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg py-3 px-4 mb-2">
                Receipt submitted successfully!
              </p>
            )}
            {vehiclesError && (
              <p className="text-center text-red-600 dark:text-red-400 font-semibold transition-colors duration-300 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg py-3 px-4 mb-2">
                {vehiclesError}
              </p>
            )}
          </div>
        )}

        {/* Vehicle Selection */}
        <div className="mb-7">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-2 transition-colors duration-300">
            Select your vehicle: <span className="text-red-500">*</span>
          </label>
          {!vehiclesError ? (
            <div
              className="grid gap-4 justify-center"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              {vehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => handleVehicleButtonClick(vehicle.vehicleId)}
                  className={`w-full px-4 py-3 rounded-lg border-2 font-semibold text-center transition-colors duration-300
                                        ${
                                          selectedVehicle === vehicle.vehicleId
                                            ? "bg-blue-600 text-white border-blue-700 shadow-lg"
                                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500"
                                        }
                                        ${validationErrors.selectedVehicle ? "border-red-500" : ""}
                                    `}
                  aria-pressed={selectedVehicle === vehicle.vehicleId}
                >
                  {vehicle.name}
                </button>
              ))}
            </div>
          ) : null}
          {validationErrors.selectedVehicle && (
            <ErrorMessage message={validationErrors.selectedVehicle} />
          )}
        </div>

        {reviewData ? (
          <div className="space-y-5">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                Confirm receipt details
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Check extracted values and correct anything that looks wrong
                before sending.
              </p>
            </div>
            {(
              [
                ["odometerReading", "Odometer reading", "number"],
                ["totalCost", "Total cost", "number"],
                ["gallonsPurchased", "Gallons purchased", "number"],
                ["datetime", "Date and time", "text"],
                ["storeBrand", "Store brand", "text"],
                ["storeAddress", "Store address", "text"],
              ] as const
            ).map(([field, label, type]) => (
              <div
                key={field}
                className="block text-sm font-semibold text-gray-700 dark:text-gray-200"
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{label}</span>
                  <button
                    type="button"
                    aria-label={`Fix ${label.toLowerCase()}`}
                    onClick={() => setActiveReviewField(field)}
                    className="rounded-md px-2 py-1 text-sm font-semibold text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-300 dark:hover:bg-gray-600"
                  >
                    Fix
                  </button>
                </div>
                <input
                  ref={activeReviewField === field ? reviewInputRef : undefined}
                  type={type}
                  readOnly={activeReviewField !== field}
                  value={reviewData[field]}
                  onChange={(event) => {
                    setReviewData((current) =>
                      current
                        ? { ...current, [field]: event.target.value }
                        : current,
                    );
                    setMissingFields((current) =>
                      current.filter((missingField) => missingField !== field),
                    );
                  }}
                  step={field === "odometerReading" ? 1 : "any"}
                  className={`mt-2 w-full rounded-lg border px-3 py-2 text-gray-800 dark:text-gray-100 ${activeReviewField === field ? "border-blue-500 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800" : "border-gray-200 bg-gray-100 dark:border-gray-600 dark:bg-gray-800/60"}`}
                />
                {missingFields.includes(field) && (
                  <span className="mt-1 block text-sm font-normal text-amber-600 dark:text-amber-300">
                    We couldn't read the {label.toLowerCase()}. Please enter it.
                  </span>
                )}
              </div>
            ))}
            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setReviewData(null);
                  setMissingFields([]);
                  setActiveReviewField(null);
                  setSubmissionStatus(null);
                }}
                className="w-1/3 rounded-lg border border-gray-300 px-4 py-3 font-bold text-gray-700 dark:border-gray-500 dark:text-gray-200"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-2/3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-bold text-white disabled:opacity-50"
              >
                {isSubmitting ? "Sending..." : "Submit Receipt"}
              </button>
            </div>
            {submissionStatus === "error" && (
              <p className="text-center text-red-600 dark:text-red-400">
                Check values and try again.
              </p>
            )}
          </div>
        ) : !selectedVehicle ? (
          <div className="text-center text-gray-600 dark:text-gray-400 mb-4">
            Please select a vehicle to continue.
          </div>
        ) : (
          <>
            {/* Receipt Photo Input */}
            <div className="mb-7">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-2 transition-colors duration-300">
                <span className="inline-block mr-2 align-middle">📸</span> Take
                a photo of your gas receipt:{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <label
                  htmlFor="receiptPhoto"
                  className={`flex items-center justify-center w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 font-medium rounded-lg border-2 ${validationErrors.receiptPhoto ? "border-red-500" : "border-blue-200 dark:border-gray-700"} cursor-pointer transition-colors duration-300`}
                >
                  <span className="mr-2">📸</span> Take/Upload a photo
                </label>
                <input
                  type="file"
                  id="receiptPhoto"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, setReceiptPhoto)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  required
                />
              </div>
              {validationErrors.receiptPhoto && (
                <ErrorMessage message={validationErrors.receiptPhoto} />
              )}
              {receiptPhoto && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic transition-colors duration-300">
                  Selected file: {receiptPhoto.name}
                </p>
              )}
            </div>

            {/* Odometer Input Method Choice */}
            <div className="mb-7">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-3 transition-colors duration-300">
                How would you like to enter the odometer reading?{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap justify-center gap-4">
                <div
                  className={`flex-1 min-w-[100px] h-24 border-2 rounded-lg flex flex-col items-center justify-center text-center text-sm font-bold cursor-pointer transition-all duration-300 transform hover:scale-105 p-2
                    ${odometerInputMethod === "separate_photo" ? "bg-blue-500 text-white border-blue-600 shadow-lg" : "border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500"}
                    ${validationErrors.odometerInputMethod ? "border-red-500" : ""}
                  `}
                  onClick={() =>
                    handleSquareSelect("separate_photo", setOdometerInputMethod)
                  }
                >
                  <span className="text-2xl mb-1">📸</span> I'll Take A Photo
                </div>
                <div
                  className={`flex-1 min-w-[100px] h-24 border-2 rounded-lg flex flex-col items-center justify-center text-center text-sm font-bold cursor-pointer transition-all duration-300 transform hover:scale-105 p-2
                     ${odometerInputMethod === "on_receipt_photo" ? "bg-blue-500 text-white border-blue-600 shadow-lg" : "border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500"}
                     ${validationErrors.odometerInputMethod ? "border-red-500" : ""}
                   `}
                  onClick={() =>
                    handleSquareSelect(
                      "on_receipt_photo",
                      setOdometerInputMethod,
                    )
                  }
                >
                  <span className="text-2xl mb-1">🖊️</span> I Wrote It On The
                  Receipt
                </div>
                <div
                  className={`flex-1 min-w-[100px] h-24 border-2 rounded-lg flex flex-col items-center justify-center text-center text-sm font-bold cursor-pointer transition-all duration-300 transform hover:scale-105 p-2
                     ${odometerInputMethod === "manual" ? "bg-blue-500 text-white border-blue-600 shadow-lg" : "border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-500"}
                     ${validationErrors.odometerInputMethod ? "border-red-500" : ""}
                   `}
                  onClick={() =>
                    handleSquareSelect("manual", setOdometerInputMethod)
                  }
                >
                  <span className="text-2xl mb-1">⌨️</span> I'll Type It
                </div>
              </div>
              {validationErrors.odometerInputMethod && (
                <ErrorMessage message={validationErrors.odometerInputMethod} />
              )}
            </div>

            {/* Conditionally Render Odometer Input */}
            {odometerInputMethod === "separate_photo" && (
              <div className="mb-7">
                <label className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-2 transition-colors duration-300">
                  <span className="inline-block mr-2 align-middle">📸</span>{" "}
                  Take a photo of your odometer:{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <label
                    htmlFor="odometerPhoto"
                    className={`flex items-center justify-center w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 font-medium rounded-lg border-2 ${validationErrors.odometerPhoto ? "border-red-500" : "border-blue-200 dark:border-gray-700"} cursor-pointer transition-colors duration-300`}
                  >
                    <span className="mr-2">📸</span> Take/Upload a photo
                  </label>
                  <input
                    type="file"
                    id="odometerPhoto"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, setOdometerPhoto)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    required={odometerInputMethod === "separate_photo"}
                  />
                </div>
                {validationErrors.odometerPhoto && (
                  <ErrorMessage message={validationErrors.odometerPhoto} />
                )}
                {odometerPhoto && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic transition-colors duration-300">
                    Selected file: {odometerPhoto.name}
                  </p>
                )}
              </div>
            )}

            {odometerInputMethod === "manual" && (
              <div className="mb-7">
                <label
                  htmlFor="odometerReading"
                  className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-2 transition-colors duration-300"
                >
                  <span className="inline-block mr-2 align-middle">🔢</span>{" "}
                  Enter odometer reading:{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="odometerReading"
                  value={odometerReading}
                  onChange={(e) => handleTextChange(e, setOdometerReading)}
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline bg-gray-50 dark:bg-gray-800 ${validationErrors.odometerReading ? "border-red-500" : "border-gray-300 dark:border-gray-600"} transition-colors duration-300`}
                  placeholder="e.g., 123456"
                  required={odometerInputMethod === "manual"}
                />
                {validationErrors.odometerReading && (
                  <ErrorMessage message={validationErrors.odometerReading} />
                )}
              </div>
            )}

            {odometerInputMethod === "on_receipt_photo" && (
              <div className="mb-7 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg text-blue-800 dark:text-blue-200 text-sm">
                Okay, we'll look for the odometer reading on the gas receipt
                photo you provided.
              </div>
            )}

            {/* Filled to Full Question */}
            <div className="mb-7">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-3 transition-colors duration-300">
                Did you fill the car to full?{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-4 justify-center">
                <div
                  className={`flex-1 h-24 border-2 rounded-lg flex flex-col items-center justify-center text-lg font-bold cursor-pointer transition-all duration-300 transform hover:scale-105
                    ${filledToFull === "yes" ? "bg-green-500 text-white border-green-600 shadow-lg" : "border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-green-500 dark:hover:border-green-500"}
                    ${validationErrors.filledToFull ? "border-red-500" : ""}
                  `}
                  onClick={() => handleSquareSelect("yes", setFilledToFull)}
                >
                  <span className="text-3xl mb-1">👍</span> Yes
                </div>
                <div
                  className={`flex-1 h-24 border-2 rounded-lg flex flex-col items-center justify-center text-lg font-bold cursor-pointer transition-all duration-300 transform hover:scale-105
                     ${filledToFull === "no" ? "bg-red-500 text-white border-red-600 shadow-lg" : "border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-red-500 dark:hover:border-red-500"}
                     ${validationErrors.filledToFull ? "border-red-500" : ""}
                   `}
                  onClick={() => handleSquareSelect("no", setFilledToFull)}
                >
                  <span className="text-3xl mb-1">👎</span> No
                </div>
              </div>
              {validationErrors.filledToFull && (
                <ErrorMessage message={validationErrors.filledToFull} />
              )}
            </div>

            {/* Filled Last Time Question */}
            <div className="mb-7">
              <label className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-2 transition-colors duration-300">
                Did you remember to fill this form out last time?{" "}
                <span className="text-red-500">*</span>
              </label>
              <p className="mb-3 text-left text-sm text-gray-600 dark:text-gray-400 italic transition-colors duration-300">
                It's okay if you didn't. Just let us know so we know how to
                track gas mileage.
              </p>
              <div className="flex space-x-4 justify-center">
                <div
                  className={`flex-1 h-24 border-2 rounded-lg flex flex-col items-center justify-center text-lg font-bold cursor-pointer transition-all duration-300 transform hover:scale-105
                    ${filledLastTime === "yes" ? "bg-green-500 text-white border-green-600 shadow-lg" : "border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-green-500 dark:hover:border-green-500"}
                    ${validationErrors.filledLastTime ? "border-red-500" : ""}
                  `}
                  onClick={() => handleSquareSelect("yes", setFilledLastTime)}
                >
                  <span className="text-3xl mb-1">✅</span> Yes
                </div>
                <div
                  className={`flex-1 h-24 border-2 rounded-lg flex flex-col items-center justify-center text-lg font-bold cursor-pointer transition-all duration-300 transform hover:scale-105
                     ${filledLastTime === "no" ? "bg-red-500 text-white border-red-600 shadow-lg" : "border-gray-300 text-gray-700 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800 hover:border-red-500 dark:hover:border-red-500"}
                     ${validationErrors.filledLastTime ? "border-red-500" : ""}
                   `}
                  onClick={() => handleSquareSelect("no", setFilledLastTime)}
                >
                  <span className="text-3xl mb-1">❌</span> No
                </div>
              </div>
              {validationErrors.filledLastTime && (
                <ErrorMessage message={validationErrors.filledLastTime} />
              )}
            </div>

            {/* Required fields note */}
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              <span className="text-red-500">*</span> Required fields
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-center mt-8 flex-col gap-2">
              <button
                type="submit"
                className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105 shadow-lg ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-2 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                    Looking at your receipt...
                  </span>
                ) : (
                  "Review Receipt"
                )}
              </button>
              {submissionStatus === "error" && (
                <p className="mt-2 text-center text-red-600 dark:text-red-400 font-semibold transition-colors duration-300">
                  Error submitting form. Please try again.
                </p>
              )}
            </div>
          </>
        )}
      </form>
    </div>
  );
}

export default GasLogForm;
