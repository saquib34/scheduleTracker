﻿import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Mail, AlertCircle, CheckCircle, Plus, X } from 'lucide-react';

const SmartSchedule = () => {
  const [schedule, setSchedule] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [syncStatus, setSyncStatus] = useState({
    email: false,
    calendar: false
  });
  const [unfinishedTasks, setUnfinishedTasks] = useState([]);
  const [waitingForConfirmation, setWaitingForConfirmation] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const fetchSchedule = async () => {
    const api_url = import.meta.env.VITE_API_URL;
    try {
      const response = await fetch(`${api_url}/api/schedule`);
      const data = await response.json();
      console.log('Received schedule data:', data);
      setSchedule(data.schedule.filter(item => item.activity !== 'Other Work' && !item.isFixed));
      setSyncStatus({
        email: data.emailSent,
        calendar: data.calendarUpdated
      });
      setLastUpdate(new Date(data.lastUpdate).toLocaleString());
      setUnfinishedTasks(data.unfinishedTasks.filter(task => task.activity !== 'Other Work'));
      setWaitingForConfirmation(data.waitingForConfirmation || []);
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
    }
  };

  useEffect(() => {
    fetchSchedule();
    const interval = setInterval(fetchSchedule, 30 * 60 * 1000);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeinstallprompt', () => {});
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  const getFixedCommitments = () => {
    const today = new Date();
    const day = today.getDay();
    const isWeekend = day === 0 || day === 6;

    const fixedCommitments = [
      { start: '00:00', end: '05:00', activity: 'Sleep', duration: 5, isFixed: true },
    ];

    if (!isWeekend) {
      fixedCommitments.push({ start: '07:30', end: '14:00', activity: 'College', duration: 6.5, isFixed: true });
      if (day !== 0) { // Not Sunday
        fixedCommitments.push({ start: '16:00', end: '19:00', activity: 'Dhobi G', duration: 3, isFixed: true });
      }
    }

    return fixedCommitments;
  };

  const handleAddTask = () => {
    if (newTask.trim()) {
      setUnfinishedTasks(prev => [...prev, { activity: newTask, duration: 1 }]);
      setNewTask('');
    }
  };

  const handleTaskCompletion = async (task) => {
    const api_url = import.meta.env.VITE_API_URL;
    try {
      const response = await fetch(`${api_url}/api/complete-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task }),
      });
      const data = await response.json();
      if (data.success) {
        console.log('Task completed successfully');
        fetchSchedule();
      } else {
        console.error('Failed to complete task');
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleTaskConfirmation = async (task, isCompleted) => {
    const api_url = import.meta.env.VITE_API_URL;
    try {
      const response = await fetch(`${api_url}/api/confirm-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task, isCompleted }),
      });
      const data = await response.json();
      if (data.success) {
        console.log('Task confirmation successful');
        fetchSchedule();
      } else {
        console.error('Failed to confirm task');
      }
    } catch (error) {
      console.error('Error confirming task:', error);
    }
  };

  const updateUnfinishedTasks = async () => {
    const api_url = import.meta.env.VITE_API_URL;
    try {
      const response = await fetch(`${api_url}/api/update-unfinished`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ unfinishedTasks }),
      });
      const data = await response.json();
      if (data.success) {
        console.log('Unfinished tasks updated successfully');
        fetchSchedule();
      } else {
        console.error('Failed to update unfinished tasks');
      }
    } catch (error) {
      console.error('Error updating unfinished tasks:', error);
    }
  };

  const isTaskOngoing = (startTime, endTime) => {
    const now = new Date();
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const taskStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHours, startMinutes);
    const taskEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHours, endMinutes);
    return now >= taskStartTime && now < taskEndTime;
  };

  const isTaskUpcoming = (startTime) => {
    const now = new Date();
    const [hours, minutes] = startTime.split(':').map(Number);
    const taskStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    return now < taskStartTime;
  };

  const isTaskEnded = (endTime) => {
    const now = new Date();
    const [hours, minutes] = endTime.split(':').map(Number);
    const taskEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    return now > taskEndTime;
  };

  const isWeekend = () => {
    const today = new Date();
    return today.getDay() === 0 || today.getDay() === 6;
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Navbar */}
      <nav className="bg-blue-600 text-white p-4 rounded-t-lg mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Smart Schedule</h1>
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
          >
            Install App
          </button>
        )}
      </nav>

      <div className="bg-white shadow rounded-lg mb-4">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold flex justify-between items-center">
            <span className="flex items-center gap-2">
              <Clock className="h-6 w-6" />
              Daily Schedule {isWeekend() ? '(Weekend)' : ''}
            </span>
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdate}
            </span>
          </h2>
        </div>
        <div className="p-4">
          {/* Sync Status */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
              {syncStatus.email ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <span>Email</span>
            </div>
            <div className="flex items-center gap-2">
              {syncStatus.calendar ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              <span>Calendar</span>
            </div>
          </div>

          {/* Fixed Commitments */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Fixed Commitments</h3>
            <div className="space-y-3">
              {getFixedCommitments().map((item, index) => (
                <div key={index} 
                     className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                  <div>
                    <span className="font-medium">{item.activity}</span>
                    <span className="text-sm text-gray-500 ml-2">({item.duration}h)</span>
                  </div>
                  <span className="text-gray-600">{item.start} - {item.end}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Schedule */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Today's Schedule</h3>
            <div className="space-y-3">
              {schedule && schedule.map((item, index) => (
                <div key={index} 
                     className={`flex items-center justify-between p-3 rounded-lg ${
                       isTaskOngoing(item.start, item.end) ? 'bg-yellow-50' :
                       isTaskUpcoming(item.start) ? 'bg-blue-50' : 'bg-red-50'
                     }`}>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{item.activity}</span>
                    <span className="text-sm text-gray-500 ml-2">({item.duration}h)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">{item.start} - {item.end}</span>
                    {isTaskEnded(item.end) && !item.isFixed && (
                      <button
                        onClick={() => handleTaskCompletion(item)}
                        className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Waiting for Confirmation */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Waiting for Confirmation</h3>
            <div className="space-y-3">
              {waitingForConfirmation.map((task, index) => (
                <div key={index} 
                     className="flex items-center justify-between bg-orange-50 p-3 rounded-lg">
                  <div>
                    <span className="font-medium">{task.activity}</span>
                    <span className="text-sm text-gray-500 ml-2">({task.duration}h)</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTaskConfirmation(task, true)}
                      className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      Completed
                    </button>
                    <button
                      onClick={() => handleTaskConfirmation(task, false)}
                      className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      Not Completed
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Unfinished Tasks */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Unfinished Tasks</h3>
            <div className="space-y-3">
              {unfinishedTasks.map((task, index) => (
                <div key={index} 
                     className="flex items-center justify-between bg-red-50 p-3 rounded-lg">
                  <div>
                    <span className="font-medium">{task.activity}</span>
                    <span className="text-sm text-gray-500 ml-2">({task.duration}h)</span>
                  </div>
                  <button
                    onClick={() => handleTaskCompletion(task)}
                    className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Complete
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add new task"
                className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddTask}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4 inline-block mr-2" />
                Add
              </button>
            </div>
          </div>

         {/* Update Button */}
         <div className="mt-6">
            <button
              onClick={updateUnfinishedTasks}
              className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Update Unfinished Tasks
            </button>
          </div>

          {/* Timeline */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Daily Timeline</h3>
            <div className="h-8 w-full bg-gray-100 rounded-full relative">
              {[...getFixedCommitments(), ...(schedule || [])].map((item, index) => {
                const startMinutes = parseInt(item.start.split(':')[0]) * 60 + 
                                   parseInt(item.start.split(':')[1]);
                const startPercent = (startMinutes / 1440) * 100;
                const duration = item.duration * 60;
                const durationPercent = (duration / 1440) * 100;
                
                return (
                  <div
                    key={index}
                    className={`absolute h-full ${
                      item.isFixed ? (
                        item.activity === 'Sleep' ? 'bg-blue-300' :
                        item.activity === 'College' ? 'bg-yellow-300' :
                        item.activity === 'Dhobi G' ? 'bg-purple-300' :
                        'bg-gray-300'
                      ) : (
                        isTaskOngoing(item.start, item.end) ? 'bg-yellow-300' :
                        isTaskUpcoming(item.start) ? 'bg-blue-300' :
                        'bg-red-300'
                      )
                    } rounded-full`}
                    style={{
                      left: `${startPercent}%`,
                      width: `${durationPercent}%`
                    }}
                    title={`${item.activity}: ${item.start} - ${item.end}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartSchedule;