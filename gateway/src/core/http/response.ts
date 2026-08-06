import { Response } from "express";

export class ApiResponse {

  static success(
    res: Response,
    data: unknown,
    message = "Success"
  ) {

    return res.status(200).json({

      success: true,

      message,

      data,

      timestamp: new Date().toISOString()

    });

  }



  static created(
    res: Response,
    data: unknown
  ) {

    return res.status(201).json({

      success: true,

      data

    });

  }

}