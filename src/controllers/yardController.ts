
import { Request, Response } from 'express';
import * as yardService from '../services/yardService';

export const moveYardInfoToHistory = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { reason,yardCharge } = req.body;

  try {
    await yardService.moveYardInfoToHistory(orderId, reason,yardCharge);
    res.status(200).json({ message: 'Yard info moved to history successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error moving yard info to history' });
  }
};
