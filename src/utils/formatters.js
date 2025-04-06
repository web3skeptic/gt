// Format date from timestamp
export const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

// Get date string for grouping
export const getDateString = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US');
};