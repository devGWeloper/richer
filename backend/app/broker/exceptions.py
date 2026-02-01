class BrokerException(Exception):
    pass


class BrokerConnectionError(BrokerException):
    pass


class BrokerOrderError(BrokerException):
    pass


class RateLimitExceeded(BrokerException):
    pass
