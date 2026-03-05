export interface DeviceInfo {
     deviceType: string; // 'Mobile' | 'Desktop' | 'Tablet' | 'Unknown'
     deviceName: string; // 'iPhone 15 Pro', 'Chrome on Windows', etc.
     platform: string; // 'iOS' | 'Android' | 'Web' | 'Unknown'
     browser?: string; // 'Chrome', 'Safari', etc.
     os?: string; // 'iOS 17.2', 'Android 14', etc.
     appVersion?: string; // Mobile app version
}

export const detectDevice = (userAgent: string, appVersion?: string): DeviceInfo => {
     const ua = userAgent.toLowerCase();

     let deviceType = 'Unknown';
     let deviceName = 'Unknown Device';
     let platform = 'Unknown';
     let browser: string | undefined;
     let os: string | undefined;

     // Detect Mobile App (custom User-Agent from Flutter/React Native)
     if (appVersion || ua.includes('vidzo') || ua.includes('mobileapp')) {
          deviceType = 'Mobile';
          platform = ua.includes('android') ? 'Android' : ua.includes('iphone') || ua.includes('ios') ? 'iOS' : 'Mobile';
          
          if (platform === 'iOS') {
               // Extract iOS version and device model
               const iosMatch = ua.match(/os (\d+)[._](\d+)/i);
               const iosVersion = iosMatch ? `${iosMatch[1]}.${iosMatch[2]}` : '';
               
               if (ua.includes('iphone')) {
                    deviceName = 'iPhone';
                    os = iosVersion ? `iOS ${iosVersion}` : 'iOS';
               } else if (ua.includes('ipad')) {
                    deviceName = 'iPad';
                    deviceType = 'Tablet';
                    os = iosVersion ? `iPadOS ${iosVersion}` : 'iPadOS';
               }
          } else if (platform === 'Android') {
               // Extract Android version and device model
               const androidMatch = ua.match(/android (\d+(?:\.\d+)?)/i);
               const androidVersion = androidMatch ? androidMatch[1] : '';
               
               // Try to extract device model
               const modelMatch = ua.match(/\(([^)]+)\)/);
               if (modelMatch) {
                    const parts = modelMatch[1].split(';');
                    const model = parts.find(p => 
                         p.includes('samsung') || 
                         p.includes('pixel') || 
                         p.includes('oneplus') ||
                         p.includes('xiaomi') ||
                         p.includes('huawei')
                    );
                    if (model) {
                         deviceName = model.trim();
                    } else {
                         deviceName = 'Android Device';
                    }
               } else {
                    deviceName = 'Android Device';
               }
               
               os = androidVersion ? `Android ${androidVersion}` : 'Android';
          }

          return {
               deviceType,
               deviceName,
               platform,
               os,
               appVersion: appVersion || undefined,
          };
     }

     // Detect platform (iOS/Android/Web)
     if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
          platform = 'iOS';
          deviceType = ua.includes('ipad') ? 'Tablet' : 'Mobile';
          
          const iosMatch = ua.match(/os (\d+)[._](\d+)/i);
          const iosVersion = iosMatch ? `${iosMatch[1]}.${iosMatch[2]}` : '';
          
          if (ua.includes('iphone')) {
               deviceName = 'iPhone';
               os = iosVersion ? `iOS ${iosVersion}` : 'iOS';
          } else if (ua.includes('ipad')) {
               deviceName = 'iPad';
               os = iosVersion ? `iPadOS ${iosVersion}` : 'iPadOS';
          }
     } else if (ua.includes('android')) {
          platform = 'Android';
          deviceType = ua.includes('mobile') ? 'Mobile' : 'Tablet';
          
          const androidMatch = ua.match(/android (\d+(?:\.\d+)?)/i);
          const androidVersion = androidMatch ? androidMatch[1] : '';
          os = androidVersion ? `Android ${androidVersion}` : 'Android';
          
          deviceName = deviceType === 'Mobile' ? 'Android Phone' : 'Android Tablet';
     } else {
          platform = 'Web';
          deviceType = 'Desktop';
     }

     // Detect browser (for web users)
     if (platform === 'Web' || !appVersion) {
          if (ua.includes('edg')) {
               browser = 'Edge';
          } else if (ua.includes('chrome') && !ua.includes('edg')) {
               browser = 'Chrome';
          } else if (ua.includes('firefox')) {
               browser = 'Firefox';
          } else if (ua.includes('safari') && !ua.includes('chrome')) {
               browser = 'Safari';
          } else if (ua.includes('opera') || ua.includes('opr')) {
               browser = 'Opera';
          } else {
               browser = 'Unknown Browser';
          }

          // Detect OS for desktop
          if (ua.includes('windows nt 10')) {
               os = 'Windows 10/11';
          } else if (ua.includes('windows nt 6.3')) {
               os = 'Windows 8.1';
          } else if (ua.includes('windows nt 6.2')) {
               os = 'Windows 8';
          } else if (ua.includes('windows nt 6.1')) {
               os = 'Windows 7';
          } else if (ua.includes('mac os x')) {
               const macMatch = ua.match(/mac os x (\d+)[._](\d+)/i);
               os = macMatch ? `macOS ${macMatch[1]}.${macMatch[2]}` : 'macOS';
          } else if (ua.includes('linux')) {
               os = 'Linux';
          } else if (ua.includes('ubuntu')) {
               os = 'Ubuntu';
          }

          deviceName = browser && os ? `${browser} on ${os}` : browser || os || 'Web Browser';
     }

     return {
          deviceType,
          deviceName,
          platform,
          browser,
          os,
          appVersion,
     };
};
