"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceDiscovery = void 0;
class ServiceDiscovery {
    constructor() {
        this.services = new Map();
        this.currentIndex = new Map(); // 用于轮询负载均衡
        // 启动健康检查
        this.healthCheckInterval = setInterval(() => {
            this.performHealthChecks();
        }, 30000); // 每30秒进行一次健康检查
    }
    /**
     * 注册服务实例
     * @param serviceName 服务名称
     * @param instanceUrl 实例URL
     * @returns 实例ID
     */
    registerService(serviceName, instanceUrl) {
        const instanceId = `${serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        if (!this.services.has(serviceName)) {
            this.services.set(serviceName, {
                name: serviceName,
                instances: []
            });
        }
        const service = this.services.get(serviceName);
        const instance = {
            id: instanceId,
            name: serviceName,
            url: instanceUrl,
            status: 'healthy',
            lastHealthCheck: Date.now()
        };
        service.instances.push(instance);
        return instanceId;
    }
    /**
     * 注销服务实例
     * @param serviceName 服务名称
     * @param instanceId 实例ID
     */
    unregisterService(serviceName, instanceId) {
        const service = this.services.get(serviceName);
        if (service) {
            service.instances = service.instances.filter(instance => instance.id !== instanceId);
            if (service.instances.length === 0) {
                this.services.delete(serviceName);
            }
        }
    }
    /**
     * 获取服务实例（负载均衡）
     * @param serviceName 服务名称
     * @returns 服务实例URL
     */
    getServiceInstance(serviceName) {
        const service = this.services.get(serviceName);
        if (!service) {
            return null;
        }
        // 过滤出健康的实例
        const healthyInstances = service.instances.filter(instance => instance.status === 'healthy');
        if (healthyInstances.length === 0) {
            return null;
        }
        // 使用轮询负载均衡算法
        let index = this.currentIndex.get(serviceName) || 0;
        index = (index + 1) % healthyInstances.length;
        this.currentIndex.set(serviceName, index);
        return healthyInstances[index].url;
    }
    /**
     * 执行健康检查
     */
    async performHealthChecks() {
        for (const service of this.services.values()) {
            for (const instance of service.instances) {
                await this.checkInstanceHealth(instance);
            }
        }
    }
    /**
     * 检查实例健康状态
     * @param instance 服务实例
     */
    async checkInstanceHealth(instance) {
        try {
            // 简单的健康检查实现
            // 在实际应用中，这里应该发送一个健康检查请求到服务实例
            // 例如：await fetch(`${instance.url}/health`)
            // 模拟健康检查
            const isHealthy = Math.random() > 0.1; // 90%的概率健康
            instance.status = isHealthy ? 'healthy' : 'unhealthy';
            instance.lastHealthCheck = Date.now();
        }
        catch (error) {
            console.error(`Health check failed for ${instance.url}:`, error);
            instance.status = 'unhealthy';
            instance.lastHealthCheck = Date.now();
        }
    }
    /**
     * 获取服务的所有实例
     * @param serviceName 服务名称
     * @returns 服务实例列表
     */
    getServiceInstances(serviceName) {
        const service = this.services.get(serviceName);
        return service ? service.instances : [];
    }
    /**
     * 获取所有服务
     * @returns 服务列表
     */
    getAllServices() {
        return Array.from(this.services.values());
    }
    /**
     * 关闭服务发现
     */
    close() {
        clearInterval(this.healthCheckInterval);
    }
}
// 导出单例实例
exports.serviceDiscovery = new ServiceDiscovery();
