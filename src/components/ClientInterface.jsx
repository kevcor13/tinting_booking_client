import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './ClientInterface.css';

function ClientInterface() {
  const { sheetId } = useParams();
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [userInfo, setUserInfo] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '',isScholarship: false });
  const [bookingComplete, setBookingComplete] = useState(false);
  const [selectedService, setSelectedService] = useState(''); // New state for selected service
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(null);
  
  const services = [
    { id: 'full-sedan-tint', name: 'Sedan Tint' },
    { id: 'Suv-tint', name: 'SUV Tint' },
    { id: 'windshield-tint', name: 'Windshield Tint' },
    { id: 'tint-removal', name: 'Tint Removal' },
    { id: 'eye_tint', name: 'Eye brow Tint' },
    // Add more services as needed
  ];
  
  
  // Replace with your actual Google Apps Script Web App URL
  const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbxPNivlWj1CJFnmaBGjtMoUDE2JaoXPADswiILVVqdtHS7vHa9EU-twX0gisSUdCYiXow/exec';
  const OTHER_SCRIPT = 'https://script.google.com/macros/s/AKfycbyjrQKzvUsbdnde37E-Sml664oZdtXwlQk3dS4uj7imzzarCyW3B2eaoBCQ7Cd9_1-7/exec';



  const formatTimeToStandard = (time) => {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':');
      const dummyDate = new Date(2000, 0, 1, parseInt(hours, 10), parseInt(minutes, 10)); // Year, Month (0-indexed), Day, Hour, Minute

      const options = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true, // For AM/PM
      };
      return dummyDate.toLocaleTimeString('en-US', options);
    } catch (e) {
      console.error("Error formatting time:", e);
      return time; // Fallback to original string if formatting fails
    }
  };

  // Convert date to day of week
  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  // Get the full date with day of week
  const getFormattedDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Load available slots on component mount and set up periodic refresh
  useEffect(() => {
    if (sheetId) {
      fetchAvailableSlots();
      
      // Set up a refresh interval to check for updates every 30 seconds
      const interval = setInterval(() => {
        fetchAvailableSlots(false);
      }, 30000);
      
      setRefreshInterval(interval);
      
      // Clean up interval on component unmount
      return () => {
        if (refreshInterval) {
          clearInterval(refreshInterval);
        }
      };
    } else {
      setIsLoading(false);
      setErrorMessage('No sheet ID provided. Please use the correct booking link.');
    }
  }, [sheetId]);

  // Fetch available slots from SheetDB
  const fetchAvailableSlots = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    
    try {
      const response = await fetch(OTHER_SCRIPT);
      if (!response.ok) {
        throw new Error('Failed to fetch available slots');
      }
      const data = await response.json();
      // Filter to only show slots with status "Available"
      const availableSlots = data.filter(slot => slot.status === 'Available');
      
      // Sort slots by date and time
      availableSlots.sort((a, b) => {
        // First compare dates
        const dateComparison = new Date(a.date) - new Date(b.date);
        if (dateComparison !== 0) return dateComparison;
        
        // If dates are the same, compare times
        return a.time.localeCompare(b.time);
      });
      
      setAvailableSlots(availableSlots);
    } catch (error) {
      setErrorMessage('Error loading available slots: ' + error.message);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  // Handle slot selection
  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
  };

  // Send emails using Google Apps Script
  const sendEmails = async () => {
    const fullName = `${userInfo.firstName} ${userInfo.lastName}`;
    const dayOfWeek = getDayOfWeek(selectedSlot.date);
    const formattedDate = getFormattedDate(selectedSlot.date);
    
    // Convert time from 24-hour to 12-hour format using the helper
    const standardTime = formatTimeToStandard(selectedSlot.time);
    const date = new Date(selectedSlot.date);
    const monthName = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();

    const serviceName = services.find(s => s.id === selectedService)?.name || 'N/A';
    
    try {
      console.log("Sending owner email...");
      // 1. Send email to the owner
      await fetch(googleScriptUrl, {
        method: 'POST',
        mode: 'no-cors', // Important for CORS issues
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'owner',
          slot_date: formattedDate,
          slot_time: standardTime,
          client_name: fullName,
          client_email: userInfo.email,
          client_phone: userInfo.phoneNumber,
          service_booked: serviceName,
        }),
      });
      
      console.log("Owner email sent");
      
      // 2. Always send scholarship email to the client
      console.log("Sending scholarship email...");
      await fetch(googleScriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'client',
          slot_date: formattedDate,
          slot_time: standardTime,
          client_name: fullName,
          client_email: userInfo.email,
          client_phone: userInfo.phoneNumber,
          service_booked: serviceName,
        }),
      });
      console.log("Scholarship email sent successfully");
      
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      // We'll consider the booking successful even if emails fail
      return true;
    }
  };

  // Handle booking form submission
  const handleBooking = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // 1. Update slot status in SheetDB
      const response = await fetch(OTHER_SCRIPT, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'update',
          payload: {
            id: selectedSlot.id,
            status: 'Booked',
            client_name: `${userInfo.firstName} ${userInfo.lastName}`,
            client_email: userInfo.email,
            client_phone: userInfo.phoneNumber,
            service_booked: services.find(s => s.id === selectedService)?.name,
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to book appointment');
      }

      // 2. Send notification emails
      await sendEmails();
      
      // Clear refresh interval when booking is complete
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      
      setBookingComplete(true);
    } catch (error) {
      setErrorMessage('Error booking appointment: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Group slots by date
  const groupSlotsByDate = () => {
    const grouped = {};
    availableSlots.forEach(slot => {
      if (!grouped[slot.date]) {
        grouped[slot.date] = [];
      }
      grouped[slot.date].push(slot);
    });
    return grouped;
  };

  // Show loading state
  if (isLoading && !bookingComplete) {
    return (
      <div className="container loading-container">
        <div className="loading-wrapper">
          <div className="spinner"></div>
          <p className="loading-text">Loading available appointments...</p>
        </div>
      </div>
    );
  }

  // Booking confirmation screen
  if (bookingComplete) {
    return (
      <div className="container">
        <div className="confirmation-message">
          <div className="success-icon">
            <svg className="check-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h2>Booking Confirmed!</h2>
          <p>Thank you, {userInfo.firstName}!</p>
          <p>Your appointment has been scheduled for:</p>
          <div className="appointment-details">
            <p>
              <strong>{getDayOfWeek(selectedSlot.date)}</strong>, {new Date(selectedSlot.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p><strong>Time:</strong> {formatTimeToStandard(selectedSlot.time)}</p>
          </div>
          <p>A confirmation email has been sent to {userInfo.email}.</p>
          <p>Please check your inbox (and spam folder) for all the details.</p>
          {userInfo.isScholarship && (
            <div className="scholarship-note">
              <p><strong>Note:</strong> As a scholarship applicant, you've received specific instructions for your interview at Sitzmann Hall.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error message display
  if (errorMessage) {
    return (
      <div className="container error-container">
        <div className="error-message">
          <h2>Error</h2>
          <p>{errorMessage}</p>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      </div>
    );
  }

  // No available slots message
  if (availableSlots.length === 0) {
    return (
      <div className="container no-slots-container">
        <div className="no-slots-message">
          <h2>No Available Appointments</h2>
          <p>Sorry, there are currently no available appointment slots.</p>
          <p>Please check back later or contact us directly to schedule.</p>
          <button onClick={() => fetchAvailableSlots()}>Refresh</button>
        </div>
      </div>
    );
  }

  // Main booking interface
  return (
    <div className="container">
      <div className="banner">
          <img src="/Title.png" alt="Guadalupe's Scholar Logo"/>
      </div>
      <h1 className="page-title">Book your appointment</h1>
      
      {!selectedSlot ? (
        <div className="slots-container">
          <p className="instructions">Select an available date and time below:</p>
          
          {Object.entries(groupSlotsByDate()).map(([date, slots]) => (
            <div key={date} className="date-group">
              <h2 className="date-header">
                <strong>{getDayOfWeek(date)}</strong>, {new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>
              <div className="time-slots">
                {slots.map(slot => (
                  <button
                    key={slot.id}
                    className="time-slot"
                    onClick={() => handleSelectSlot(slot)}
                  >
                    {formatTimeToStandard(slot.time)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="booking-form-container">
          <div className="selected-slot-info">
            <h3>Selected Appointment:</h3>
            <p>
              <strong>{getDayOfWeek(selectedSlot.date)}</strong>, {new Date(selectedSlot.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p><strong>Time:</strong> {formatTimeToStandard(selectedSlot.time)}</p>
            <button 
              className="change-slot-btn"
              onClick={() => setSelectedSlot(null)}
            >
              Change Selection
            </button>
          </div>
          
          <form className="booking-form" onSubmit={handleBooking}>
            <h3>Please Complete Your Booking</h3>
            <div className="form-group">
              <label htmlFor="service">Select Service</label>
              <select
                id="service"
                required
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="dropdown-select" // Add a class for styling
              >
                <option value="">-- Please choose a service --</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                required
                value={userInfo.firstName}
                onChange={(e) => setUserInfo({...userInfo, firstName: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                required
                value={userInfo.lastName}
                onChange={(e) => setUserInfo({...userInfo, lastName: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number</label>
              <input
                type="tel" // Use type="tel" for phone numbers
                id="phoneNumber"
                required // Make it required if necessary
                value={userInfo.phoneNumber}
                onChange={(e) => setUserInfo({...userInfo, phoneNumber: e.target.value})}
                placeholder="e.g., (123) 456-7890" // Add a placeholder for format guidance
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                required
                value={userInfo.email}
                onChange={(e) => setUserInfo({...userInfo, email: e.target.value})}
              />
            </div>
            
            <button type="submit" className="book-btn">
              Confirm Booking
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default ClientInterface;
