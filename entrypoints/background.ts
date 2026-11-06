import { defineBackground } from 'wxt/sandbox';

export default defineBackground(() => {
  // Listen for scheduled alarms (such as Pomodoro session end)
  if (typeof browser !== 'undefined' && browser.alarms?.onAlarm) {
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name.startsWith('nookspace-timer-')) {
        browser.notifications?.create({
          type: 'basic',
          iconUrl: 'icon/128.png',
          title: 'NookSpace Focus Session',
          message: 'Your scheduled session has completed! Time for a well-deserved break.',
        });
      }
    });
  } else if (typeof chrome !== 'undefined' && chrome.alarms?.onAlarm) {
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name.startsWith('nookspace-timer-')) {
        chrome.notifications?.create('', {
          type: 'basic',
          iconUrl: 'icon/128.png',
          title: 'NookSpace Focus Session',
          message: 'Your scheduled session has completed! Time for a well-deserved break.',
        });
      }
    });
  }
});
