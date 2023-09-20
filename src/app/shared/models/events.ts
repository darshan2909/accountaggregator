const NADL_LOADED = {
    eventCode: 'NADL-LOADED',
    message: 'Able to open NADL successfully'
}

export class NEW_USER {
    eventCode: 'NADL-USER-NEW'
    message: 'New user to NADL'
}

export class EXIST_USER {
    eventCode: 'NADL-USER-EXISTING'
    message: 'Existing user to NADL'
}

export class OTP_INIT {
    eventCode: 'NADL-INIT-OTP'
    message: 'NADL OTP initialised'
}

export class OTP_VERIFY {
    eventCode: 'NADL-VERIFY-OTP'
    message: 'NADL OTP verified'
}

export class OTP_RESENT {
    eventCode: 'NADL-OTP-RESENT'
    message: 'NADL OTP requested resent'
}

//ERROR
export class OTP_LOCKED {
    eventCode: 'NADL-OTP-LOCKED'
    message: 'NADL account locked'
}

//ERROR
export class OTP_FAILED {
    eventCode: 'NADL-OTP-FAILED'
    message: 'Failed to send NADL OTP'
}

//ERROR
export class OTP_VERIFY_FAILED {
    eventCode: 'NADL-OTP-VERIFYFAILED'
    message: 'Failed to verify NADL OTP'
}

export class SELECT_FIP {
    eventCode: 'NADL-SELECT-FIP'
    message: 'FIP selected on NADL'
}
export class DISCOVER_SUCCESS {
    eventCode: 'NADL-DISCOVERED'
    message: 'Accounts discovered on NADL'
}

export class DISCOVER_FAILED {
    eventCode: 'NADL-DISCOVERY-FAILED'
    message: 'Unable to discover atleast one account from any of the FIPs'
}

export class NO_DISC_ACCOUNTS {
    eventCode: 'NADL-DISCOVERY-NOACCOUNTS'
    message: 'No accounts discovered'
}

export class ALTERNATE_NUMBER {
    eventCode: 'NADL-ALTERNATENO'
    message: 'Alternate number used for discovery'
}

export class ALT_NUMBER_OTP {
    eventCode: 'NADL-ALTERNATENO-VERIFIED'
    message: 'Alternate number OTP verified'
}

export class ACCOUNT_LINK_INIT {
    eventCode: 'NADL-LINK-INIT'
    message: 'Account linking initiated'
}

export class ACCOUNT_LINK_CONFIRM {
    eventCode: 'NADL-LINK-CONFIRM'
    message: 'Account linking confirmed'
}

export class ACCOUNT_LINK_FAILED {
    eventCode: 'NADL-LINK-FAILED'
    message: 'Account linking confirmation failed'
}

export class CONSENT_LOAD {
    eventCode: 'NADL-CONSENT-LOAD'
    message: 'Consent screen loaded with atleast one account displayed'
}

export class CONSENT_NO_ACCOUNTS {
    eventCode: 'NADL-CONSENT-NOACCOUNTS'
    message: 'Consent screen loaded with no accounts listed'
}

export class CONSENT_APPROVED {
    eventCode: 'NADL-CONSENT-APPROVED'
    message: 'Consent approved'
}

export class CONSENT_REJECTED {
    eventCode: 'NADL-CONSENT-REJECTED'
    message: 'Consent rejected'
}

export class CONSENT_FAILED {
    eventCode: 'NADL-CONSENT-FAILED'
    message: 'Consent failed'
}

export class SERVER_ERROR {
    eventCode: 'NADL-SERVER-ERROR';
    message: 'Respective error message will be returned when there are any server errors of NADL'
}

export interface event {
    eventCode: string;
    message: string;
}

export class NADL_LOAD {
    getNadlLoaded(): event {
        return NADL_LOADED
    }
}




