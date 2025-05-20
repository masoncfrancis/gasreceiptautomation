'use client';

import React from 'react';
import { useAuth0 } from "@auth0/auth0-react";


function LoginLanding() {

    const { loginWithRedirect } = useAuth0();


    return (
        <div className="container mx-auto p-6 bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 min-h-screen flex items-center justify-center transition-colors duration-300">
            <div className="bg-white dark:bg-gray-700 p-10 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-600 transition-colors duration-300 text-center">
                <h1 className="text-4xl font-extrabold mb-6 text-gray-800 dark:text-white transition-colors duration-300">
                    Gas & Mileage Tracker
                </h1>
                <p className="text-lg mb-8 text-gray-700 dark:text-gray-200 transition-colors duration-300">
                    You must log in to continue
                </p>
                <div className="flex flex-col gap-4">
                    <button
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                        onClick={() => loginWithRedirect()}
                    >
                        Log In
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LoginLanding;