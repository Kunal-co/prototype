// CICIDS2017 Feature Schema
const CICIDS2017_FEATURES = [
  'Destination Port',
  'Flow Duration',
  'Total Fwd Packets',
  'Total Backward Packets',
  'Total Length of Fwd Packets',
  'Total Length of Bwd Packets',
  'Fwd Packet Length Max',
  'Fwd Packet Length Min',
  'Fwd Packet Length Mean',
  'Fwd Packet Length Std',
  'Bwd Packet Length Max',
  'Bwd Packet Length Min',
  'Bwd Packet Length Mean',
  'Bwd Packet Length Std',
  'Flow Bytes/s',
  'Flow Packets/s',
  'Flow IAT Mean',
  'Flow IAT Std',
  'Flow IAT Max',
  'Flow IAT Min',
  'Fwd IAT Total',
  'Fwd IAT Mean',
  'Fwd IAT Std',
  'Fwd IAT Max',
  'Fwd IAT Min',
  'Bwd IAT Total',
  'Bwd IAT Mean',
  'Bwd IAT Std',
  'Bwd IAT Max',
  'Bwd IAT Min',
  'Fwd PSH Flags',
  'Bwd PSH Flags',
  'Fwd URG Flags',
  'Bwd URG Flags',
  'Fwd Header Length',
  'Bwd Header Length',
  'Fwd Packets/s',
  'Bwd Packets/s',
  'Min Packet Length',
  'Max Packet Length',
  'Packet Length Mean',
  'Packet Length Std',
  'Packet Length Variance',
  'FIN Flag Count',
  'SYN Flag Count',
  'RST Flag Count',
  'PSH Flag Count',
  'ACK Flag Count',
  'URG Flag Count',
  'CWE Flag Count',
  'ECE Flag Count',
  'Down/Up Ratio',
  'Average Packet Size',
  'Avg Fwd Segment Size',
  'Avg Bwd Segment Size',
  'Fwd Header Length.1',
  'Fwd Avg Bytes/Bulk',
  'Fwd Avg Packets/Bulk',
  'Fwd Avg Bulk Rate',
  'Bwd Avg Bytes/Bulk',
  'Bwd Avg Packets/Bulk',
  'Bwd Avg Bulk Rate',
  'Subflow Fwd Packets',
  'Subflow Fwd Bytes',
  'Subflow Bwd Packets',
  'Subflow Bwd Bytes',
  'Init_Win_bytes_forward',
  'Init_Win_bytes_backward',
  'act_data_pkt_fwd',
  'min_seg_size_forward',
  'Active Mean',
  'Active Std',
  'Active Max',
  'Active Min',
  'Idle Mean',
  'Idle Std',
  'Idle Max',
  'Idle Min'
];

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function prepareFlow(body = {}) {
  try {
    const features = body.features;

    if (!features || typeof features !== 'object' || Array.isArray(features)) {
      throw new ApiError(
        400,
        'INVALID_FEATURES',
        '"features" must be a non-empty object'
      );
    }

    const cleanedFeatures = {};
    const providedKeys = Object.keys(features);

    if (providedKeys.length === 0) {
      throw new ApiError(
        400,
        'INVALID_FEATURES',
        'Features object must contain at least one feature'
      );
    }

    // Validate and clean each feature
    for (const [key, value] of Object.entries(features)) {
      let numericValue = value;

      if (typeof value === 'string') {
        numericValue = parseFloat(value);
        if (isNaN(numericValue)) {
          throw new ApiError(
            400,
            'INVALID_FEATURE_VALUE',
            `Feature "${key}" must be a valid number`
          );
        }
      } else if (typeof value !== 'number') {
        throw new ApiError(
          400,
          'INVALID_FEATURE_VALUE',
          `Feature "${key}" must be a number or numeric string`
        );
      }

      if (!Number.isFinite(numericValue)) {
        throw new ApiError(
          400,
          'INVALID_FEATURE_VALUE',
          `Feature "${key}" must be a finite number`
        );
      }

      cleanedFeatures[key] = numericValue;
    }

    // Create feature vector in correct order for model
    const featureVector = {};
    for (const featureName of CICIDS2017_FEATURES) {
      featureVector[featureName] = cleanedFeatures[featureName] ?? 0;
    }

    // Add any extra features provided
    for (const [key, value] of Object.entries(cleanedFeatures)) {
      if (!featureVector.hasOwnProperty(key)) {
        featureVector[key] = value;
      }
    }

    const stringify = (val) => {
      if (val == null || val === '') return null;
      return String(val);
    };

    return {
      modelRequest: { features: featureVector },
      sourceIp: stringify(body.sourceIp),
      destinationIp: stringify(body.destinationIp),
      destinationPort: body.destinationPort ? parseInt(body.destinationPort) : null,
      mockScenario: body.mockScenario || 'normal'
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(400, 'INVALID_REQUEST', error.message);
  }
}

module.exports = {
  prepareFlow,
  ApiError,
  CICIDS2017_FEATURES
};