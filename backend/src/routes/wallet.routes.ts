import dotenv from 'dotenv';
import { Router, Request, Response } from 'express';
import SomniaWalletService from '../services/blockchain/SomniaWalletService';

// Load environment variables before instantiating service
dotenv.config();

const router = Router();
const walletService = new SomniaWalletService();

/**
 * GET /api/wallet/network/status
 * Get network status
 * Must be defined before /:calendarId route
 */
router.get('/network/status', async (req: Request, res: Response) => {
  try {
    const status = await walletService.getNetworkStatus();

    return res.json({
      success: true,
      network: status,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get network status',
    });
  }
});

/**
 * GET /api/wallet/:calendarId
 * Get wallet information for a calendar ID
 */
router.get('/:calendarId', async (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params;

    if (!calendarId) {
      return res.status(400).json({
        success: false,
        error: 'Calendar ID is required',
      });
    }

    const walletInfo = await walletService.getWalletInfo(calendarId);

    return res.json({
      success: true,
      wallet: walletInfo,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get wallet information',
    });
  }
});

/**
 * GET /api/wallet/:calendarId/address
 * Get just the wallet address
 */
router.get('/:calendarId/address', (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params;

    if (!calendarId) {
      return res.status(400).json({
        success: false,
        error: 'Calendar ID is required',
      });
    }

    const address = walletService.getWalletAddress(calendarId);

    return res.json({
      success: true,
      address,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get wallet address',
    });
  }
});

/**
 * POST /api/wallet/:calendarId/send
 * Send tokens from calendar wallet
 */
router.post('/:calendarId/send', async (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params;
    const { to, amount } = req.body;

    if (!calendarId || !to || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Calendar ID, recipient address, and amount are required',
      });
    }

    const result = await walletService.sendTransaction(calendarId, to, amount);

    if (result.success) {
      return res.json({
        success: true,
        message: 'Transaction sent successfully',
        hash: result.hash,
        explorerUrl: result.explorerUrl,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send transaction',
    });
  }
});

/**
 * POST /api/wallet/:calendarId/faucet
 * Request testnet funds from faucet
 */
router.post('/:calendarId/faucet', async (req: Request, res: Response) => {
  try {
    const { calendarId } = req.params;

    if (!calendarId) {
      return res.status(400).json({
        success: false,
        error: 'Calendar ID is required',
      });
    }

    const address = walletService.getWalletAddress(calendarId);
    await walletService.requestFaucetFunds(calendarId);

    return res.json({
      success: true,
      message: 'Faucet request initiated',
      address,
      faucetUrl: 'https://faucet.somnia.network',
      instructions: `Visit https://faucet.somnia.network and paste your address: ${address}`,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to request faucet funds',
    });
  }
});

export { router as walletRouter, walletService };

