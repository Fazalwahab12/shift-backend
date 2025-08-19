# React Native App API Integration Guide

## App Structure Review

Based on the React Native app analysis, here's the correct API integration for each screen and flow:

### **Authentication Flow Integration**

#### 1. Splash Screen → Login Screen
**File**: `app/(auth)/splash/index.tsx`
- No API integration needed
- Auto-navigates to login after animation

#### 2. Login Screen → OTP Flow
**File**: `app/(auth)/login/index.tsx`

**API Integration:**
```typescript
// Phone Registration API Call
const registerPhone = async (phoneNumber: string, userType: 'seeker' | 'company') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/phone/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: phoneNumber.replace(/\D/g, ''), // Remove non-digits
        countryCode: '+968', // Oman country code
        userType: userType
      })
    });

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        userId: data.data.userId,
        nextStep: data.data.nextStep, // 'otp_verification'
        ...data.data
      };
    } else {
      // Handle existing phone number
      if (response.status === 409) {
        return {
          success: false,
          exists: true,
          userData: data.data
        };
      }
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Phone registration error:', error);
    throw error;
  }
};

// Usage in Login component
const handlePhoneSubmit = async () => {
  try {
    setLoading(true);
    const result = await registerPhone(phoneNumber, selectedUserType);
    
    if (result.success) {
      // Store user data for next steps
      await AsyncStorage.setItem('userId', result.userId);
      await AsyncStorage.setItem('userType', selectedUserType);
      
      // Navigate to OTP screen
      router.push(`/(auth)/otp?userId=${result.userId}&phone=${phoneNumber}`);
    } else if (result.exists) {
      // User already exists, handle accordingly
      handleExistingUser(result.userData);
    }
  } catch (error) {
    Alert.alert('Error', error.message);
  } finally {
    setLoading(false);
  }
};
```

#### 3. OTP Verification Screen
**File**: `app/(auth)/otp/index.tsx`

**API Integration:**
```typescript
// OTP Verification API Call
const verifyOTP = async (userId: string, otp: string) => {
  try {
    // In production, you would validate OTP with SMS provider
    // For now, we'll simulate verification
    const response = await fetch(`${API_BASE_URL}/api/phone/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        verified: true // In production, this would be based on OTP validation
      })
    });

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        nextStep: data.data.nextStep, // 'onboarding' or 'profile_creation'
        ...data.data
      };
    }
    throw new Error(data.message);
  } catch (error) {
    console.error('OTP verification error:', error);
    throw error;
  }
};

// Usage in OTP component
const handleOTPSubmit = async () => {
  try {
    setLoading(true);
    const result = await verifyOTP(userId, otpCode);
    
    if (result.success) {
      await AsyncStorage.setItem('phoneVerified', 'true');
      
      // Navigate based on next step
      if (result.nextStep === 'onboarding') {
        router.push('/(auth)/onboarding');
      } else if (result.nextStep === 'profile_creation') {
        // User has completed onboarding, go to profile
        const userType = await AsyncStorage.getItem('userType');
        router.push(`/(${userType})/profile-setup`);
      }
    }
  } catch (error) {
    Alert.alert('Error', error.message);
  } finally {
    setLoading(false);
  }
};
```

#### 4. Onboarding Screen (Role Selection)
**File**: `app/(auth)/onboarding/index.tsx`

**API Integration:**
```typescript
// Key Preferences API Call (matches existing key-permas screen)
const submitOnboardingData = async (onboardingData: OnboardingData) => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    const userType = await AsyncStorage.getItem('userType');
    
    const response = await fetch(`${API_BASE_URL}/api/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        userType: userType,
        selectedIndustries: onboardingData.industries,
        selectedRoles: onboardingData.roles,
        experienceLevel: onboardingData.experienceLevel, // For seekers
        hiringNeeds: onboardingData.hiringNeeds, // For companies
        typicalHiringRoles: onboardingData.typicalHiringRoles, // For companies
        referralSource: onboardingData.referralSource,
        referralDetails: onboardingData.referralDetails
      })
    });

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        nextStep: data.data.nextStep, // 'profile_creation'
        ...data.data
      };
    }
    throw new Error(data.message);
  } catch (error) {
    console.error('Onboarding submission error:', error);
    throw error;
  }
};

// Usage in Onboarding component (integrate with existing key-permas logic)
const handleOnboardingComplete = async () => {
  try {
    setLoading(true);
    
    const onboardingData = {
      industries: selectedIndustries,
      roles: selectedRoles,
      experienceLevel: userType === 'seeker' ? selectedExperienceLevel : undefined,
      hiringNeeds: userType === 'company' ? selectedHiringNeeds : undefined,
      typicalHiringRoles: userType === 'company' ? selectedRoles : undefined,
      referralSource: selectedReferralSource,
      referralDetails: referralDetails
    };
    
    const result = await submitOnboardingData(onboardingData);
    
    if (result.success) {
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      
      // Navigate to profile creation
      const userType = await AsyncStorage.getItem('userType');
      if (userType === 'seeker') {
        router.push('/(seeker)/seeker-profile');
      } else {
        router.push('/(company)/company-profile');
      }
    }
  } catch (error) {
    Alert.alert('Error', error.message);
  } finally {
    setLoading(false);
  }
};
```

### **Seeker Profile Flow Integration**

#### 5. Seeker Profile Creation (5 Steps)
**Files**: `app/(seeker)/seeker-profile/SeekerProfileStep*.tsx`

**API Integration:**
```typescript
// Create Seeker Profile API Call
const createSeekerProfile = async (profileData: SeekerProfileData) => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    
    const response = await fetch(`${API_BASE_URL}/api/seekers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        ...profileData
      })
    });

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        seekerId: data.data.id,
        inheritedFromOnboarding: data.data.inheritedFromOnboarding,
        ...data.data
      };
    }
    throw new Error(data.message);
  } catch (error) {
    console.error('Seeker profile creation error:', error);
    throw error;
  }
};

// Update Profile Step API Call
const updateSeekerProfileStep = async (seekerId: string, step: number, stepData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/seekers/${seekerId}/step/${step}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stepData)
    });

    const data = await response.json();
    
    if (data.success) {
      return data.data;
    }
    throw new Error(data.message);
  } catch (error) {
    console.error('Profile step update error:', error);
    throw error;
  }
};

// Usage in Seeker Profile Steps
const handleCreateProfile = async () => {
  try {
    const profileData = {
      firstName: firstName,
      lastName: lastName,
      email: email,
      dateOfBirth: dateOfBirth,
      gender: gender,
      nationality: 'Omani'
    };
    
    const result = await createSeekerProfile(profileData);
    
    if (result.success) {
      await AsyncStorage.setItem('seekerId', result.seekerId);
      
      // Show inherited data from onboarding
      if (result.inheritedFromOnboarding) {
        Alert.alert(
          'Profile Created', 
          `Your profile has been created with your selected industries: ${result.inheritedFromOnboarding.industries.join(', ')}`
        );
      }
      
      // Continue to next step
      navigation.navigate('SeekerProfileStep2');
    }
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};

// Step completion handlers
const completeStep = async (step: number, stepData: any) => {
  try {
    const seekerId = await AsyncStorage.getItem('seekerId');
    const result = await updateSeekerProfileStep(seekerId, step, stepData);
    
    // Update progress
    setCompletionPercentage(result.completionPercentage);
    
    if (result.isProfileComplete) {
      // Profile completed, navigate to main app
      router.push('/(seeker)/(tabs)');
    } else {
      // Continue to next step
      navigation.navigate(`SeekerProfileStep${step + 1}`);
    }
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

### **Company Profile Flow Integration**

#### 6. Company Profile Creation (6 Steps)
**Files**: `app/(company)/company-profile/CompanyProfileStep*.tsx`

**API Integration:**
```typescript
// Create Company Profile API Call
const createCompanyProfile = async (profileData: CompanyProfileData) => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    
    const response = await fetch(`${API_BASE_URL}/api/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        ...profileData
      })
    });

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        companyId: data.data.id,
        inheritedFromOnboarding: data.data.inheritedFromOnboarding,
        ...data.data
      };
    }
    throw new Error(data.message);
  } catch (error) {
    console.error('Company profile creation error:', error);
    throw error;
  }
};

// Update Company Profile Step API Call
const updateCompanyProfileStep = async (companyId: string, step: number, stepData: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/companies/${companyId}/step/${step}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stepData)
    });

    const data = await response.json();
    
    if (data.success) {
      return data.data;
    }
    throw new Error(data.message);
  } catch (error) {
    console.error('Company profile step update error:', error);
    throw error;
  }
};

// Usage in Company Profile Steps
const handleCreateCompanyProfile = async () => {
  try {
    const profileData = {
      companyName: companyName,
      companyNameArabic: companyNameArabic,
      commercialRegistrationNumber: crNumber,
      primaryIndustry: primaryIndustry,
      companyEmail: companyEmail,
      companyPhone: companyPhone,
      companySize: companySize,
      establishedYear: establishedYear
    };
    
    const result = await createCompanyProfile(profileData);
    
    if (result.success) {
      await AsyncStorage.setItem('companyId', result.companyId);
      
      // Show inherited data from onboarding
      if (result.inheritedFromOnboarding) {
        Alert.alert(
          'Company Profile Created', 
          `Your profile includes hiring for: ${result.inheritedFromOnboarding.typicalHiringRoles.join(', ')}`
        );
      }
      
      // Continue to next step
      navigation.navigate('CompanyProfileStep2');
    }
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

### **Key Preferences Integration**
**Files**: `app/(seeker)/key-permas/index.tsx`, `app/(company)/key-permas/index.tsx`

**API Integration for existing key-preferences screens:**
```typescript
// This integrates with the existing key-permas screens
// The onboarding API calls would be made from these existing screens

// Get Industries/Roles data
const getIndustriesAndRoles = async () => {
  try {
    // You can add these endpoints to serve the data
    const [industriesResponse, rolesResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/onboarding/popular-industries`),
      fetch(`${API_BASE_URL}/api/onboarding/popular-roles`)
    ]);
    
    const industriesData = await industriesResponse.json();
    const rolesData = await rolesResponse.json();
    
    return {
      industries: industriesData.data,
      roles: rolesData.data
    };
  } catch (error) {
    console.error('Error fetching industries/roles:', error);
    return { industries: [], roles: [] };
  }
};
```

### **User Journey Tracking**

**API Integration for journey tracking:**
```typescript
// Get User Journey Status
const getUserJourneyStatus = async () => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    
    const response = await fetch(`${API_BASE_URL}/api/journey/${userId}`);
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    }
    throw new Error(data.message);
  } catch (error) {
    console.error('Journey status error:', error);
    throw error;
  }
};

// Get Next Actions
const getNextActions = async () => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    
    const response = await fetch(`${API_BASE_URL}/api/journey/${userId}/next-actions`);
    const data = await response.json();
    
    if (data.success) {
      return data.data.actions;
    }
    throw new Error(data.message);
  } catch (error) {
    console.error('Next actions error:', error);
    throw error;
  }
};
```

### **Configuration**

**API Base URL Configuration:**
```typescript
// config/api.ts
export const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? 'http://localhost:3000' // Development
    : 'https://api.shift-oman.com', // Production
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

export const API_BASE_URL = API_CONFIG.BASE_URL;
```

### **Error Handling**

**Common error handling:**
```typescript
// utils/apiErrorHandler.ts
export const handleApiError = (error: any, context: string) => {
  console.error(`${context} error:`, error);
  
  if (error.message.includes('Network')) {
    Alert.alert('Connection Error', 'Please check your internet connection');
  } else if (error.message.includes('timeout')) {
    Alert.alert('Timeout Error', 'Request took too long. Please try again');
  } else {
    Alert.alert('Error', error.message || 'Something went wrong');
  }
};
```

## Summary

This integration guide shows how to connect the existing React Native app screens with the backend API, maintaining the current app structure while adding proper data flow through:

1. **Phone Registration** → Backend user creation
2. **OTP Verification** → Phone verification API
3. **Onboarding** → Industry/role preferences storage
4. **Profile Creation** → Complete profile with inherited data
5. **Journey Tracking** → Progress monitoring

The integration preserves the existing app flow while adding backend data persistence and the relationships needed for the recommendation engine.