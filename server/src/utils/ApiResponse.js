class ApiResponse {
  constructor(statusCode = 200, message = 'Operation successful', data = {}, meta) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  send(response) {
    const body = {
      success: true,
      message: this.message,
      data: this.data,
    };

    if (this.meta !== undefined) {
      body.meta = this.meta;
    }

    return response.status(this.statusCode).json(body);
  }
}

export default ApiResponse;
