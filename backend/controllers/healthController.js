export const getHealth = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'UrbanFlux AI Backend is operational',
    timestamp: new Date().toISOString()
  });
};
